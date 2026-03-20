import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
    try {
        const supabase = await createClient();

        // 1. Authenticate User
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Unauthorized. Neural Link broken." },
                { status: 401 }
            );
        }

        console.log(`[Trinetra] Processing Sovereign Upgrade for User: ${user.id}`);

        // 2. Check if Profile Exists (Optional resilience)
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single();

        if (!existingProfile) {
            // Auto-Heal: Create profile if missing (Edge case)
            console.log(`[Trinetra] Profile missing. Creating default for upgrade.`);
            await supabase.from('profiles').insert({
                id: user.id,
                email: user.email,
                subscription_tier: 'free',
                agents_created: 0,
                agent_limit: 1
            });
        }

        // 3. Grant Sovereignty
        const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update({
                subscription_tier: 'sovereign',
                agent_limit: 100,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id)
            .select()
            .single();

        if (updateError) {
            console.error("[Trinetra] Upgrade Failed:", updateError);
            return NextResponse.json(
                { error: "Database rejected upgrade protocol." },
                { status: 500 }
            );
        }

        console.log(`[Trinetra] Upgrade Successful for ${user.email}`);

        return NextResponse.json({
            success: true,
            message: "Sovereignty Granted.",
            profile: updatedProfile
        });

    } catch (error: any) {
        console.error("[Trinetra] Payment Error:", error);
        return NextResponse.json(
            { error: "Transaction Failed at Neural Gateway." },
            { status: 500 }
        );
    }
}
