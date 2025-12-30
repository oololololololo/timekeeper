'use server'

import { createClient } from '@/utils/supabase/server'

export async function logSpeakerTime(
    meetingId: string,
    speakerId: string,
    addedSeconds: number,
    allocatedSeconds: number,
    speakerName: string,
    speakerEmail?: string
) {
    const supabase = await createClient()

    // 1. Verify Authentication & Ownership
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Unauthorized' }
    }

    // Check if user owns the meeting (simple check)
    const { data: meeting } = await supabase.from('meetings').select('host_id').eq('id', meetingId).single()
    if (!meeting || meeting.host_id !== user.id) {
        // Technically strict RLS would block the insert/update anyway, but good to check.
        // If the table RLS handles it, we can skip, but query is cheap.
        return { error: 'Unauthorized or Meeting not found' }
    }

    // 2. Upsert Logic (Manual because no unique constraint on (meeting_id, speaker_id))
    // Check if record exists
    const { data: existing } = await supabase
        .from('meeting_speakers')
        .select('id, spoken_seconds')
        .eq('meeting_id', meetingId)
        .eq('speaker_id', speakerId)
        .single()

    if (existing) {
        // UPDATE
        const { error } = await supabase
            .from('meeting_speakers')
            .update({
                spoken_seconds: existing.spoken_seconds + addedSeconds,
                allocated_seconds: allocatedSeconds, // Always update to latest allocation known
                name_snapshot: speakerName, // Update snapshot just in case
                email_snapshot: speakerEmail
            })
            .eq('id', existing.id)

        if (error) return { error: error.message }
    } else {
        // INSERT
        const { error } = await supabase
            .from('meeting_speakers')
            .insert({
                meeting_id: meetingId,
                speaker_id: speakerId,
                name_snapshot: speakerName,
                email_snapshot: speakerEmail,
                spoken_seconds: addedSeconds,
                allocated_seconds: allocatedSeconds
            })

        if (error) return { error: error.message }
    }

    return { success: true }
}
