import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Debes iniciar sesión primero' }, { status: 401 })
    }

    // 1. Borrar datos anteriores de este usuario
    // Nota: Esto borrará TODO lo de este usuario. Úsalo con cuidado.
    await supabase.from('meetings').delete().eq('host_id', user.id)
    await supabase.from('speakers').delete().eq('user_id', user.id)

    // 2. Crear Oradores
    const speakersData = [
        { user_id: user.id, name: 'Ana García', email: 'ana@empresa.com', default_cost_per_hour: 50000 },
        { user_id: user.id, name: 'Carlos Ruiz', email: 'carlos@empresa.com', default_cost_per_hour: 45000 },
        { user_id: user.id, name: 'Elena Torres', email: 'elena@empresa.com', default_cost_per_hour: 60000 },
    ]

    const { data: speakers } = await supabase.from('speakers').insert(speakersData).select()

    if (!speakers) return NextResponse.json({ error: 'Error creando oradores' })

    const s1 = speakers.find(s => s.name.includes('Ana'))
    const s2 = speakers.find(s => s.name.includes('Carlos'))
    const s3 = speakers.find(s => s.name.includes('Elena'))

    // 3. Crear Reuniones
    const now = new Date()
    const twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000)).toISOString()
    const fiveDaysAgo = new Date(now.getTime() - (5 * 24 * 60 * 60 * 1000)).toISOString()

    const meetingsData = [
        {
            id: 'DEMO_' + Math.floor(Math.random() * 10000),
            host_id: user.id,
            title: 'Weekly Sync - Marketing',
            status: 'finished',
            created_at: twoDaysAgo,
            speakers: [
                { name: s1.name, minutes: 10, speaker_id: s1.id },
                { name: s2.name, minutes: 15, speaker_id: s2.id },
                { name: s3.name, minutes: 5, speaker_id: s3.id }
            ],
            meta: {
                avgMonthlyCost: 1500000,
                attendees: 5,
                objective: 'Sincronizar campañas Q3',
                shareCost: true
            },
            timer_state: { isRunning: false, isPaused: true, remainingSeconds: 0, currentSpeakerIndex: 2 }
        },
        {
            id: 'DEMO_' + Math.floor(Math.random() * 10000),
            host_id: user.id,
            title: 'Revisión Estrategia Q3',
            status: 'finished',
            created_at: fiveDaysAgo,
            speakers: [
                { name: s3.name, minutes: 20, speaker_id: s3.id },
                { name: s1.name, minutes: 20, speaker_id: s1.id }
            ],
            meta: {
                avgMonthlyCost: 2500000,
                attendees: 8,
                objective: 'Definir OKRs',
                shareCost: true
            },
            timer_state: { isRunning: false, isPaused: true, remainingSeconds: 0, currentSpeakerIndex: 1 }
        },
        {
            id: 'DEMO_' + Math.floor(Math.random() * 10000),
            host_id: user.id,
            title: 'Daily Standup',
            status: 'scheduled',
            created_at: now.toISOString(),
            speakers: [
                { name: 'Equipo', minutes: 15 }
            ],
            meta: {
                avgMonthlyCost: 1000000,
                attendees: 6
            },
            timer_state: { isRunning: false, isPaused: false, remainingSeconds: 900, currentSpeakerIndex: 0 }
        }
    ]

    const { data: insertedMeetings, error } = await supabase.from('meetings').insert(meetingsData).select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // 4. Crear Logs de Oradores (Para Analytics)
    const logsData = []

    // Meeting 1: Weekly Sync (Finalizada)
    const m1 = insertedMeetings.find(m => m.title.includes('Weekly'))
    if (m1) {
        logsData.push(
            { meeting_id: m1.id, speaker_id: s1.id, name_snapshot: s1.name, allocated_seconds: 600, spoken_seconds: 550, cost_incurred: (550 / 3600) * s1.default_cost_per_hour },
            { meeting_id: m1.id, speaker_id: s2.id, name_snapshot: s2.name, allocated_seconds: 900, spoken_seconds: 800, cost_incurred: (800 / 3600) * s2.default_cost_per_hour },
            { meeting_id: m1.id, speaker_id: s3.id, name_snapshot: s3.name, allocated_seconds: 300, spoken_seconds: 320, cost_incurred: (320 / 3600) * s3.default_cost_per_hour }
        )
    }

    // Meeting 2: Estrategia (Finalizada)
    const m2 = insertedMeetings.find(m => m.title.includes('Estrategia'))
    if (m2) {
        logsData.push(
            { meeting_id: m2.id, speaker_id: s3.id, name_snapshot: s3.name, allocated_seconds: 1200, spoken_seconds: 1100, cost_incurred: (1100 / 3600) * s3.default_cost_per_hour },
            { meeting_id: m2.id, speaker_id: s1.id, name_snapshot: s1.name, allocated_seconds: 1200, spoken_seconds: 1250, cost_incurred: (1250 / 3600) * s1.default_cost_per_hour }
        )
    }

    if (logsData.length > 0) {
        await supabase.from('meeting_speakers').insert(logsData)
    }

    return NextResponse.json({
        success: true,
        message: 'Datos de demostración y métricas creados exitosamente.',
        speakersCreated: speakers.length,
        meetingsCreated: insertedMeetings.length,
        logsCreated: logsData.length
    })
}
