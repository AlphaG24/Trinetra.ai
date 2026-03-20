'use server';

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function joinWaitlist(agentName: string) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "User not authenticated" };
    }

    const { error } = await supabase
        .from('waitlist_entries')
        .insert({
            user_id: user.id,
            agent_name: agentName
        });

    if (error) {
        if (error.code === '23505') { // Unique violation code
            return { message: "You are already on the waitlist!" };
        }
        return { error: error.message };
    }

    revalidatePath('/dashboard/marketplace');
    return { success: true };
}
