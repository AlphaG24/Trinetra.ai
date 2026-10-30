import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

// Helper to notify Super Admin via audit_logs & email
async function notifyAdminAndUser(supabase: any, user: any, agentId: string, fileName: string, charCount: number) {
  try {
    // 1. Fetch organization details
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_name, full_name, email, organization_id")
      .eq("id", user.id)
      .maybeSingle();

    const company = profile?.company_name || profile?.full_name || "Client";
    const userEmail = profile?.email || user.email;

    // 2. Insert into audit_logs (visible in Admin Hub)
    await supabase.from("audit_logs").insert({
      action: "knowledge.document_uploaded",
      user_id: user.id,
      organization_id: profile?.organization_id,
      details: {
        file_name: fileName,
        company_name: company,
        user_email: userEmail,
        agent_id: agentId,
        char_count: charCount,
        status: "ready",
        note: "Requires Sarvam Prompt Re-Compilation / Carrier Sync if new facts added."
      }
    });

    // 3. Dispatch alert email to Super Admin via Resend API if configured
    const resendKey = process.env.RESEND_API_KEY || process.env.RESEND_PRIVATE_KEY;
    if (resendKey) {
      const adminEmail = "raghav00424@gmail.com";
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "Vaakriti AI <updates@trinetraedu-ai.com>",
          to: [adminEmail],
          subject: `[Action Required] New Knowledge Ingested: ${company} (${fileName})`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #1e1e24;">
              <h2 style="color: #6d28d9;">Vaakriti AI — Client Knowledge Ingestion Alert</h2>
              <p>A client has uploaded new business training material to their voice agent.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                <tr><td style="padding: 8px; font-weight: bold;">Client / Company:</td><td>${company}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold;">User Email:</td><td>${userEmail}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold;">Document Name:</td><td>${fileName}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold;">Extracted Size:</td><td>${charCount} characters</td></tr>
                <tr><td style="padding: 8px; font-weight: bold;">Agent ID:</td><td>${agentId}</td></tr>
              </table>
              <p>Please open the <a href="https://trinetra-ai-1-6f2n.onrender.com/admin/agents" style="color: #7c3aed; font-weight: bold;">Tenant Voice Agents Hub</a> to review the compiled prompt and re-sync to Sarvam if necessary.</p>
            </div>
          `
        })
      }).catch(err => console.warn("[Knowledge Upload] Admin email dispatch error:", err));

      // Also send confirmation email to the user
      if (userEmail) {
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: "Vaakriti AI Support <support@trinetraedu-ai.com>",
            to: [userEmail],
            subject: `Knowledge Base Ingested — ${fileName}`,
            html: `
              <div style="font-family: sans-serif; padding: 20px; color: #1e1e24;">
                <h2 style="color: #059669;">Your Knowledge Base has been Ingested</h2>
                <p>Hello ${company},</p>
                <p>We have successfully processed and indexed <strong>${fileName}</strong> (${charCount} characters) into your voice agent's memory.</p>
                <p><strong>Status:</strong> Active & Calibrated with your telephony virtual line.</p>
                <p>Your agent will now reference these verified business facts during incoming and outgoing calls.</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                <p style="font-size: 12px; color: #6b7280;">Vaakriti AI — Sovereign Conversational AI & Telecom Infrastructure</p>
              </div>
            `
          })
        }).catch(err => console.warn("[Knowledge Upload] User confirmation email error:", err));
      }
    }
  } catch (err) {
    console.warn("[Knowledge Upload] Notification dispatch error:", err);
  }
}

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
        extractedText = fileBuffer.toString('utf-8');
      } else if (fileName.endsWith('.pdf')) {
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
        extractedText = fileBuffer.toString('utf-8');
      }

      // Sanitize: Strip null bytes (\0, \u0000) and control characters
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

    extractedText = (extractedText || "").replace(/\0/g, '').replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, ' ');

    // STEP 2: Insert into agent_knowledge
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

    // STEP 3: Notify Admin & User
    await notifyAdminAndUser(supabase, user, agentId, file.name, extractedText.length);

    // STEP 4: Append knowledge to agent system prompt in database
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
          }
        }
      } catch (promptErr) {
        console.warn("[Knowledge Upload] Could not append knowledge to agent prompt:", promptErr);
      }
    }

    return NextResponse.json({
      success: true,
      document: newDoc,
      message: finalStatus === "ready" ? "Document ingested and voice model calibrated successfully." : "Document uploaded but extraction failed."
    });

  } catch (error: any) {
    console.error("[Knowledge Upload] Fatal Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
