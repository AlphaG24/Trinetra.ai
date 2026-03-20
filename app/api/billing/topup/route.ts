import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const EXPACK_MAP: Record<string, number> = {
    'starter': 80,
    'business': 200,
    'enterprise': 450
};

export async function POST(req: Request) {
    try {
        const supabase = await createClient(); // Auth checking client

        // 1. Auth Check
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        let { minutes, packageId } = body;

        // Logic Validation
        if (packageId && EXPACK_MAP[packageId]) {
            minutes = EXPACK_MAP[packageId];
        }

        if (!minutes || typeof minutes !== 'number' || minutes <= 0) {
            return NextResponse.json({ error: "Invalid minutes value" }, { status: 400 });
        }

        const secondsToAdd = Math.floor(minutes * 60);

        // 2. Database Update (USING ADMIN CLIENT)
        const supabaseAdmin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        // First get current limit
        const { data: profile, error: fetchError } = await supabaseAdmin
            .from("profiles")
            .select("monthly_limit_seconds")
            .eq("id", user.id)
            .single();

        if (fetchError) {
            console.error("Profile fetch error:", fetchError);
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        const currentLimit = profile?.monthly_limit_seconds || 600;
        const newLimit = currentLimit + secondsToAdd;

        const { error: updateError } = await supabaseAdmin
            .from("profiles")
            .update({ monthly_limit_seconds: newLimit })
            .eq("id", user.id);

        if (updateError) {
            console.error("Topup update error:", updateError);
            return NextResponse.json({ error: "Update failed" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            addedMinutes: minutes,
            newLimitSeconds: newLimit
        }, { status: 200 });

    } catch (error: any) {
        console.error("Topup API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
