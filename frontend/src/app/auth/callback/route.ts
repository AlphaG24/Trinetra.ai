import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    console.log("--- CALLBACK HIT ---", request.url);
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/dashboard";

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            console.log("--- REDIRECTING TO ---", next);
            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    // return the user to an error page with instructions
    console.log("--- AUTH ERROR REDIRECTING TO ---", `${origin}/auth/auth-code-error`);
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
