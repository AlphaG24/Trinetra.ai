// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Edge Function to Auto-Scan files uploaded to Storage
serve(async (req) => {
    try {
        const payload = await req.json()
        const { type, record, schema, table } = payload

        // Only listen for new object creations in 'audits' bucket
        // Note: The actual trigger configuration happens in Supabase Dashboard or migrations.
        // This function handles the webhook logic.

        console.log(`Processing webhook: ${type} on ${table}`)

        // Initialize Supabase Client (Service Role for admin access)
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Get the file path
        const filePath = record.name; // e.g., 'folder/file.pdf'
        const bucketId = record.bucket_id;

        if (bucketId !== 'audits') {
            return new Response(JSON.stringify({ message: 'Ignored bucket' }), { status: 200 })
        }

        // 2. Download the file
        const { data: fileData, error: downloadError } = await supabase.storage
            .from(bucketId)
            .download(filePath)

        if (downloadError) {
            console.error('Download Error:', downloadError);
            return new Response('Failed to download file', { status: 500 })
        }

        // 3. Extract Text
        // In Edge Functions, heavy PDF parsing is limited. 
        // Recommended: Use an external OCR API or a dedicated Python microservice.
        // For this demo, we assume the user uploads .txt or we mock extraction.
        const textContent = await fileData.text();
        // Note: If binary PDF, this will be garbage. Real implementation requires 'pdf-parse' or similar.

        // 4. Perform Analysis (Call OpenAI / Ollama)
        // Here we can call the App's API or OpenAI directly.
        // Calling the App's API might require Authentication.

        // Simulating Analysis Result
        const riskScore = Math.floor(Math.random() * 100);
        const findings = {
            scan_type: 'ghost_auto',
            notes: 'Automated scan via Edge Function',
            full_text: textContent.substring(0, 1000)
        };

        // 5. Store Result in DB (Triggering Realtime for Ghost Dashboard)
        const { error: insertError } = await supabase
            .from('audit_history')
            .insert({
                file_name: filePath.split('/').pop(),
                extracted_text: textContent,
                risk_score: riskScore,
                findings: findings,
                user_id: record.owner // Owner ID from storage object
            })

        if (insertError) {
            console.error('DB Insert Error:', insertError);
            return new Response('Failed to save audit', { status: 500 })
        }

        return new Response(JSON.stringify({ success: true, riskScore }), {
            headers: { 'Content-Type': 'application/json' },
        })

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 })
    }
})
