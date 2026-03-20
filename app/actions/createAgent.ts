'use server'

import { createClient } from '@/utils/supabase/server'

export async function createAgent(formData: FormData) {
    const supabase = await createClient()

    try {
        // Auth Check
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            throw new Error('Unauthorized')
        }

        // Extract Data
        const name = formData.get('name') as string
        const role = (formData.get('role') as string) || 'Receptionist'
        const voiceId = formData.get('voiceId') as string // From form (optional)
        const primaryLanguage = formData.get('primary_language') as string // From form (optional)

        // Validation
        if (!name || name.trim() === '') {
            return { success: false, error: 'Name is required' }
        }

        // Insert
        // Note: Inserting 'active' as status and 'voice_id' as column based on requirements.
        // If schema differs (e.g. status takes 'online', column is 'voice'), this will need adjustment.
        const { data: insertedAgent, error: insertError } = await supabase
            .from('agents')
            .insert({
                user_id: user.id,
                name,
                role,
                status: 'active', // Requested status
                voice_id: voiceId, // Requested column
                // Optional primary_language if available
                ...(primaryLanguage && { primary_language: primaryLanguage }),
            })
            .select()
            .single()

        if (insertError) {
            console.error('Error creating agent:', insertError)
            return { success: false, error: insertError.message }
        }

        return { success: true, agent: insertedAgent }
    } catch (error) {
        console.error('Unexpected error in createAgent:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'An unexpected error occurred',
        }
    }
}
