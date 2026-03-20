'use server';

import { createClient } from "@/utils/supabase/server";
import { randomBytes } from "crypto";

export async function getUserSettings() {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    // Fetch settings
    const { data: settings, error } = await supabase
        .from('user_api_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (error && error.code === 'PGRST116') {
        // Settings not found, create default
        const newApiKey = `sk_live_${randomBytes(16).toString('hex')}`;
        const { data: newSettings, error: createError } = await supabase
            .from('user_api_settings')
            .insert({
                user_id: user.id,
                api_key: newApiKey,
                tier: 'PROTOCOL',
                requests_used: 0,
                request_limit: 100
            })
            .select()
            .single();

        if (createError) {
            console.error('Error creating settings:', JSON.stringify(createError, null, 2));
            return { error: 'Failed to initialize settings' };
        }
        return { data: newSettings };
    } else if (error) {
        console.error('Error fetching settings:', error);
        return { error: 'Failed to fetch settings' };
    }

    return { data: settings };
}

export async function regenerateApiKey() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const newApiKey = `sk_live_${randomBytes(16).toString('hex')}`;

    const { error } = await supabase
        .from('user_api_settings')
        .update({ api_key: newApiKey })
        .eq('user_id', user.id);

    if (error) {
        console.error('Error updating API key:', error);
        return { error: 'Failed to regenerate key' };
    }

    return { success: true, api_key: newApiKey };
}
