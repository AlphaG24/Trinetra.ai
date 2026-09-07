import os
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
import httpx
from database import supabase_admin, supabase

router = APIRouter(prefix="/api/knowledge", tags=["Knowledge Base"])

from typing import Optional

class QueryRequest(BaseModel):
    query: str
    vapi_agent_id: Optional[str] = None
    agent_id: Optional[str] = None

@router.post("/upload")
async def upload_document(
    vapi_agent_id: Optional[str] = Form(None),
    agent_id: Optional[str] = Form(None),
    user_id: str = Form(...),
    file: UploadFile = File(...)
):
    target_id = agent_id or vapi_agent_id
    if not target_id:
        raise HTTPException(status_code=400, detail="agent_id or vapi_agent_id is required")

    try:
        content = await file.read()
        file_name = file.filename or f"doc_{uuid.uuid4().hex[:8]}.txt"
        file_ext = os.path.splitext(file_name)[1].lower()
        doc_id = str(uuid.uuid4())

        # STEP 1: Extract text SYNCHRONOUSLY (not background)
        extracted_text = ""
        parse_status = "processing"
        
        try:
            if file_ext == ".pdf":
                import io, pypdf
                reader = pypdf.PdfReader(io.BytesIO(content))
                extracted_text = "".join([page.extract_text() or "" for page in reader.pages])
            elif file_ext in [".docx", ".doc"]:
                import io, docx
                doc_file = docx.Document(io.BytesIO(content))
                extracted_text = "\n".join([p.text for p in doc_file.paragraphs])
            else:  # TXT and other text formats
                extracted_text = content.decode("utf-8", errors="ignore")
            
            parse_status = "ready"
            extracted_text = extracted_text[:100000]
            print(f"[KNOWLEDGE UPLOAD] Successfully extracted {len(extracted_text)} chars from {file_name}", flush=True)
            
        except Exception as parse_err:
            parse_status = "failed"
            extracted_text = f"Extraction error: {str(parse_err)}"
            print(f"[KNOWLEDGE UPLOAD ERROR] Failed to parse {file_name}: {parse_err}", flush=True)

        # STEP 2: Insert document with FINAL status (not 'processing')
        payload = {
            "id": doc_id,
            "user_id": user_id,
            "vapi_agent_id": target_id,
            "agent_id": target_id,
            "name": file_name,
            "file_url": f"https://storage.trinetraedu-ai.com/{target_id}/{file_name}",
            "status": parse_status,  # 'ready' or 'failed' — NOT 'processing'
            "content_excerpt": extracted_text,
            "created_at": datetime.utcnow().isoformat()
        }

        res = supabase_admin.table("agent_knowledge").insert(payload).execute()
        doc_data = res.data[0] if res.data else payload

        return {
            "status": "success",
            "message": f"Document uploaded and {'extracted successfully' if parse_status == 'ready' else 'failed to extract'}",
            "document": doc_data
        }

    except Exception as e:
        print(f"[KNOWLEDGE UPLOAD FATAL] {e}", flush=True)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("/extract-pdf")
async def extract_pdf(file: UploadFile = File(...)):
    import io, pypdf
    content = await file.read()
    reader = pypdf.PdfReader(io.BytesIO(content))
    text = "".join([page.extract_text() or "" for page in reader.pages])
    return {"text": text[:100000]}

@router.post("/extract-docx")
async def extract_docx(file: UploadFile = File(...)):
    import io, docx
    content = await file.read()
    doc = docx.Document(io.BytesIO(content))
    text = "\n".join([p.text for p in doc.paragraphs])
    return {"text": text[:100000]}

from typing import Optional

@router.get("/documents")
async def get_documents(user_id: str, vapi_agent_id: Optional[str] = None, agent_id: Optional[str] = None):
    try:
        query = supabase_admin.table("agent_knowledge").select("*").eq("user_id", user_id)
        if agent_id:
            query = query.eq("agent_id", agent_id)
        elif vapi_agent_id:
            query = query.eq("vapi_agent_id", vapi_agent_id)
        
        res = query.execute()
        docs = res.data or []
        return {"status": "success", "documents": docs}
    except Exception as e:
        return {"status": "success", "documents": []}

@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    try:
        try:
            supabase_admin.table("agent_knowledge").delete().eq("id", doc_id).execute()
        except Exception:
            pass
        return {"status": "success", "message": "Document deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/query")
async def query_knowledge(req: QueryRequest):
    try:
        docs = []
        try:
            query = supabase_admin.table("agent_knowledge").select("*").eq("status", "ready")
            if req.agent_id:
                query = query.eq("agent_id", req.agent_id)
            elif req.vapi_agent_id:
                query = query.eq("vapi_agent_id", req.vapi_agent_id)
                
            res = query.execute()
            docs = res.data or []
        except Exception:
            pass

        if not docs:
            return {"status": "success", "answer": "No documents uploaded yet. Please upload documents to enable Q&A."}

        # Build context — truncate to fit Groq's limits
        context_parts = []
        total_chars = 0
        max_context = 8000  # Safe limit for Groq
        
        for doc in docs:
            name = doc.get('name', 'Untitled')
            content = doc.get('content_excerpt', '')
            if content:
                chunk = f"--- Document: {name} ---\n{content[:2000]}"  # Max 2000 chars per doc
                if total_chars + len(chunk) > max_context:
                    context_parts.append(f"--- Document: {name} ---\n{content[:max_context - total_chars - 50]}...")
                    break
                context_parts.append(chunk)
                total_chars += len(chunk)
        
        context = "\n\n".join(context_parts)
        
        if not context:
            return {"status": "error", "answer": "No content extracted from documents yet."}
        # Call Groq
        groq_key = os.getenv("GROQ_API_KEY")
        if not groq_key:
            return {"status": "error", "answer": "LLM API key not configured"}

        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {groq_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": os.getenv("GROQ_LLM_MODEL", "openai/gpt-oss-120b"),
                    "messages": [
                        {
                            "role": "system",
                            "content": f"You are a knowledge base Q&A assistant. Answer using ONLY the document context below. If not found, say so.\n\n=== CONTEXT ===\n{context}\n=== END ==="
                        },
                        {"role": "user", "content": req.query}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 500
                }
            )
            
            if res.status_code != 200:
                return {"status": "error", "answer": f"LLM error: {res.text}"}
            
            data = res.json()
            answer = data["choices"][0]["message"]["content"]
            return {"status": "success", "answer": answer}

    except Exception as e:
        return {"status": "error", "answer": f"Query failed: {str(e)}"}
