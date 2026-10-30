import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const agentId = formData.get("agent_id") as string;

    if (!file || !agentId) {
      return NextResponse.json({ error: "File and Agent ID are required." }, { status: 400 });
    }

    console.log(`[Knowledge Upload] Processing ${file.name} for agent ${agentId}`);

    // STEP 1: Extract text from the file
    let extractedText = "";
    let finalStatus = "ready";

    try {
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.txt')) {
        // TXT file — read directly
        extractedText = fileBuffer.toString('utf-8');
      } else if (fileName.endsWith('.pdf')) {
        // PDF file — parse directly in Node.js using pdf-parse or fallback to backend
        try {
          const pdfParse = require('pdf-parse');
          const pdfData = await pdfParse(fileBuffer);
          extractedText = pdfData.text || "";
        } catch (localPdfErr) {
          const backendUrl = process.env.INTERNAL_BACKEND_URL || process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000';
          const backendForm = new FormData();
          backendForm.append('file', new Blob([fileBuffer]), file.name);
          const backendRes = await fetch(`${backendUrl}/api/knowledge/extract-pdf`, {
            method: 'POST',
            body: backendForm
          });
          if (backendRes.ok) {
            const data = await backendRes.json();
            extractedText = data.text || "";
          } else {
            throw new Error(`PDF extraction failed: ${localPdfErr}`);
          }
        }
      } else if (fileName.endsWith('.docx')) {
        // DOCX — parse directly using mammoth or fallback to backend
        try {
          const mammoth = require('mammoth');
          const result = await mammoth.extractRawText({ buffer: fileBuffer });
          extractedText = result.value || "";
        } catch (localDocxErr) {
          const backendUrl = process.env.INTERNAL_BACKEND_URL || process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000';
          const backendForm = new FormData();
          backendForm.append('file', new Blob([fileBuffer]), file.name);
          const backendRes = await fetch(`${backendUrl}/api/knowledge/extract-docx`, {
            method: 'POST',
            body: backendForm
          });
          if (backendRes.ok) {
            const data = await backendRes.json();
            extractedText = data.text || "";
          } else {
            throw new Error(`DOCX extraction failed: ${localDocxErr}`);
          }
        }
      } else {
        // Unsupported format — try reading as text
        extractedText = fileBuffer.toString('utf-8');
      }

      // Sanitize extracted text: Strip null bytes (\0, \u0000) and unescaped control characters
      // that cause PostgreSQL to throw "unsupported Unicode escape sequence"
      extractedText = extractedText
        .replace(/\0/g, '')
        .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, ' ')
        .slice(0, 100000);

      console.log(`[Knowledge Upload] Extracted and sanitized ${extractedText.length} chars from ${file.name}`);
      
    } catch (parseErr: any) {
      finalStatus = "failed";
      extractedText = `Extraction failed: ${parseErr.message}`;
      console.error(`[Knowledge Upload] Extraction error: ${parseErr.message}`);
    }

    // Ensure fallback text is also clean of null bytes
    extractedText = (extractedText || "").replace(/\0/g, '').replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, ' ');

    // STEP 2: Insert with FINAL status (NOT 'parsing' or 'processing')
    const { data: newDoc, error: insertError } = await supabase
      .from("agent_knowledge")
      .insert({
        user_id: user.id,
        agent_id: agentId,
        name: file.name,
        status: finalStatus,
        content_excerpt: extractedText,
        file_url: "https://storage.trinetraedu-ai.com/" + agentId + "/" + file.name
      })
      .select()
      .single();

    if (insertError) {
      console.error("[Knowledge Upload] DB Error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Notify Admin of new knowledge upload in audit_logs
    try {
      await supabase.from("audit_logs").insert({
        action: "knowledge.document_uploaded",
        user_id: user.id,
        organization_id: (user as any).organization_id,
        details: {
          file_name: file.name,
          agent_id: agentId,
          char_count: extractedText.length,
          status: finalStatus
        }
      });
    } catch (auditErr) {
      // Non-blocking
    }

    // STEP 3: Automatically train/update agent system prompt with knowledge
    if (finalStatus === "ready" && extractedText && extractedText.trim()) {
      try {
        const { data: currentAgent } = await supabase
          .from("agents")
          .select("system_prompt, name, voice_id, primary_language")
          .eq("id", agentId)
          .maybeSingle();

        if (currentAgent) {
          const oldPrompt = currentAgent.system_prompt || "";
          const knowledgeBlock = `\n\n=== VERIFIED BUSINESS KNOWLEDGE: ${file.name} ===\n${extractedText.slice(0, 4000)}\n========================================\n`;
          
          if (!oldPrompt.includes(file.name)) {
            const newPrompt = `${oldPrompt.trim()}${knowledgeBlock}`;
            await supabase
              .from("agents")
              .update({ system_prompt: newPrompt })
              .eq("id", agentId);

            // Sync to backend engine
            const backendUrl = process.env.INTERNAL_BACKEND_URL || process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000';
            fetch(`${backendUrl}/api/sarvam/sync-agent`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                agent_id: agentId,
                name: currentAgent.name,
                system_prompt: newPrompt,
                voice_id: currentAgent.voice_id || 'shubh',
                language: currentAgent.primary_language || 'hi'
              })
            }).catch(() => {});
          }
        }
      } catch (promptErr) {
        console.warn("[Knowledge Upload] Could not append knowledge to agent prompt:", promptErr);
      }
    }

    return NextResponse.json({
      success: true,
      document: newDoc,
      message: finalStatus === "ready" ? "Document uploaded and agent trained successfully." : "Document uploaded but extraction failed."
    });

  } catch (error: any) {
    console.error("[Knowledge Upload] Fatal Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
