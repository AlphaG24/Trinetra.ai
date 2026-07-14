import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { requireAuth } from "../../../../../utils/apiAuth";

export const runtime = 'nodejs';

export async function POST(req: Request) {
    try {
        // SECURITY: Verify the caller is authenticated
        const authResult = await requireAuth();
        if (authResult instanceof Response) return authResult;

        const { auditId, original, fix, reason } = await req.json();

        if (!auditId || !fix) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const supabase = await createClient();

        // 1. Fetch current findings
        const { data: audit, error: fetchError } = await supabase
            .from('audit_history')
            .select('findings')
            .eq('id', auditId)
            .single();

        if (fetchError || !audit) {
            return NextResponse.json({ error: "Audit record not found" }, { status: 404 });
        }

        const currentFindings = audit.findings || {};
        const remediations = currentFindings.remediations || [];

        // 2. Append new fix
        const newFix = {
            original,
            fix,
            reason,
            timestamp: new Date().toISOString()
        };

        const updatedFindings = {
            ...currentFindings,
            remediations: [...remediations, newFix]
        };

        // 3. Update DB
        const { error: updateError } = await supabase
            .from('audit_history')
            .update({ findings: updatedFindings })
            .eq('id', auditId);

        if (updateError) {
            console.error(updateError);
            return NextResponse.json({ error: "Failed to save fix" }, { status: 500 });
        }

        return NextResponse.json({ success: true, count: updatedFindings.remediations.length });

    } catch (error: any) {
        console.error("Save Fix Error:", error);
        // SECURITY: Never expose internal error details
        return NextResponse.json({ error: "Failed to save fix." }, { status: 500 });
    }
}
