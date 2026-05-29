'use server';

import { createClient } from "@/utils/supabase/server";

export async function submitEnterpriseLead(formData: FormData) {
    const supabase = await createClient();

    const rawData = {
        work_email: formData.get('work_email') as string,
        company_name: formData.get('company_name') as string,
        infrastructure_needs: formData.get('infrastructure_needs') as string,
        message: formData.get('message') as string,
    };

    if (!rawData.work_email || !rawData.company_name || !rawData.infrastructure_needs) {
        return { error: 'Missing required fields' };
    }

    const { error } = await supabase
        .from('enterprise_leads')
        .insert(rawData);

    if (error) {
        console.error('Error submitting lead:', error);
        return { error: 'Failed to submit transmission. Please try again.' };
    }

    return { success: true };
}
