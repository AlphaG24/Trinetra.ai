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
        // PDF file — proxy to FastAPI backend for extraction
        const backendForm = new FormData();
        backendForm.append('file', new Blob([fileBuffer]), file.name);
        const backendRes = await fetch('http://127.0.0.1:8000/api/knowledge/extract-pdf', {
          method: 'POST',
          body: backendForm
        });
        if (backendRes.ok) {
          const data = await backendRes.json();
          extractedText = data.text || "";
        } else {
          throw new Error("PDF extraction failed");
        }
      } else if (fileName.endsWith('.docx')) {
        // DOCX — proxy to FastAPI backend
        const backendForm = new FormData();
        backendForm.append('file', new Blob([fileBuffer]), file.name);
        const backendRes = await fetch('http://127.0.0.1:8000/api/knowledge/extract-docx', {
          method: 'POST',
          body: backendForm
        });
        if (backendRes.ok) {
          const data = await backendRes.json();
          extractedText = data.text || "";
        } else {
          throw new Error("DOCX extraction failed");
        }
      } else {
        // Unsupported format — try reading as text
        extractedText = fileBuffer.toString('utf-8');
      }

      extractedText = extractedText.slice(0, 100000); // Limit to 100k chars
      console.log(`[Knowledge Upload] Extracted ${extractedText.length} chars from ${file.name}`);
      
    } catch (parseErr: any) {
      finalStatus = "failed";
      extractedText = `Extraction failed: ${parseErr.message}`;
      console.error(`[Knowledge Upload] Extraction error: ${parseErr.message}`);
    }

    // STEP 2: Insert with FINAL status (NOT 'parsing')
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

    return NextResponse.json({
      success: true,
      document: newDoc,
      message: finalStatus === "ready" ? "Document uploaded and extracted successfully." : "Document uploaded but extraction failed."
    });

  } catch (error: any) {
    console.error("[Knowledge Upload] Fatal Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
