'use server';

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

export async function deployDemoService(serviceSlug: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "User not authenticated" };
    }

    // 1. Fetch the platform service to extract demo_limit_config
    const { data: tool, error: toolError } = await supabase
        .from('platform_services')
        .select('*')
        .eq('slug', serviceSlug)
        .maybeSingle();

    if (toolError || !tool) {
        return { error: toolError?.message || "Tool not found" };
    }

    // 2. Check if a quota row already exists for this user/slug
    const { data: existingQuota, error: quotaError } = await supabase
        .from('user_service_quotas')
        .select('id')
        .eq('user_id', user.id)
        .eq('service_slug', serviceSlug)
        .maybeSingle();

    if (quotaError) {
        return { error: quotaError.message };
    }

    // 3. If a quota row doesn't exist, insert a new one
    if (!existingQuota) {
        const demoLimitConfig = tool.demo_limit_config || {};
        const usageMetricType = demoLimitConfig.type || 'runs';
        const quotaAllocated = demoLimitConfig.value ?? 10;

        const { error: insertError } = await supabase
            .from('user_service_quotas')
            .insert({
                user_id: user.id,
                service_slug: serviceSlug,
                is_demo: true,
                usage_metric_type: usageMetricType,
                quota_allocated: quotaAllocated,
                quota_used: 0
            });

        if (insertError) {
            return { error: insertError.message };
        }
    }

    // 4. Revalidate cache
    revalidatePath('/dashboard/marketplace');
    revalidatePath(`/dashboard/tools/${serviceSlug}`);

    // 5. Redirect the user to the dynamic tool page
    redirect(`/dashboard/tools/${serviceSlug}`);
}
