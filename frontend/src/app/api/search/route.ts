import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { requireAuth } from "../../../../utils/apiAuth";

export const runtime = 'nodejs'; // or edge, but nodejs is safe

export async function GET(req: Request) {
    // SECURITY: Verify the caller is authenticated
    const authResult = await requireAuth();
    if (authResult instanceof Response) return authResult;

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
        return NextResponse.json({ audits: [], standards: [] });
    }

    const supabase = await createClient();

    // Parallel Search
    const [auditRes, vaultRes] = await Promise.all([
        supabase
            .from('audit_history')
            .select('id, file_name, risk_score, created_at')
            .ilike('file_name', `%${query}%`)
            .order('created_at', { ascending: false })
            .limit(5),

        supabase
            .from('knowledge_vault')
            .select('id, file_name, created_at')
            .ilike('file_name', `%${query}%`)
            .limit(5)
    ]);

    // Note: Searching inside JSON/Embeddings is slower, sticking to filename for speed in Nexus Search
    // Expanded search could use search_vectors if configured.

    return NextResponse.json({
        audits: auditRes.data || [],
        standards: vaultRes.data || []
    });
}
