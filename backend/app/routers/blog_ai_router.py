from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
import logging
from app.services.content_moderation import ContentModeration
from groq import AsyncGroq
import os

router = APIRouter(prefix="/api/ai/blog", tags=["Blog AI"])
logger = logging.getLogger(__name__)

# Single moderation instance
moderation_service = ContentModeration()
groq_client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY")) if os.getenv("GROQ_API_KEY") else None

class ModerateRequest(BaseModel):
    text: str
    user_id: str

class EnhanceRequest(BaseModel):
    text: str
    action: str # 'enhance', 'rewrite', 'grammar', 'continue', 'summarize'
    blog_title: str = ""

@router.post("/moderate")
async def moderate_content(request: ModerateRequest):
    """
    Called by Next.js during blog creation/update.
    """
    try:
        result = await moderation_service.check_content(request.text)
        
        # Evaluate history and auto-block if necessary
        is_blocked = await moderation_service.evaluate_user_history(
            user_id=request.user_id,
            current_severity=result["severity"],
            current_violation=", ".join(result["violations"]) if result["violations"] else "Clean"
        )
        
        return {
            "is_clean": result["is_clean"],
            "violations": result["violations"],
            "severity": result["severity"],
            "is_blocked": is_blocked
        }
    except Exception as e:
        logger.error(f"Moderation endpoint error: {e}")
        # Fail open if AI fails, but log it
        return {"is_clean": True, "violations": [], "severity": "none", "is_blocked": False}

@router.post("/enhance")
async def enhance_text(request: EnhanceRequest):
    """
    AI Writing Assistant endpoint.
    """
    if not groq_client:
        raise HTTPException(status_code=500, detail="Groq API key not configured")

    system_prompts = {
        "enhance": "You are an expert editor. Enhance the given text for better flow, clarity, and engagement while keeping the core meaning intact. Return ONLY the enhanced text.",
        "rewrite": "You are a professional writer. Rewrite the given text to sound more professional and compelling. Return ONLY the rewritten text.",
        "grammar": "You are a proofreader. Fix all spelling and grammar mistakes in the given text. Do not change the tone or structure unnecessarily. Return ONLY the corrected text.",
        "continue": "You are a co-writer. Continue the following text naturally based on the context provided. Write 2-3 additional sentences. Return ONLY the new continued text, not the original text.",
        "summarize": "Summarize the given text into 1-2 concise sentences. Return ONLY the summary."
    }

    if request.action not in system_prompts:
        raise HTTPException(status_code=400, detail="Invalid action")

    try:
        context = f"Blog Title Context: {request.blog_title}\n\n" if request.blog_title else ""
        prompt = f"{context}Text to process:\n{request.text}"
        
        # Temperature mapping
        temp = 0.3 if request.action == "grammar" else 0.7

        chat_completion = await groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompts[request.action]},
                {"role": "user", "content": prompt}
            ],
            model="mixtral-8x7b-32768",
            temperature=temp,
            max_tokens=1024
        )

        enhanced_text = chat_completion.choices[0].message.content
        return {"enhanced_text": enhanced_text.strip()}
    except Exception as e:
        logger.error(f"Groq enhancement error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process text via AI")
