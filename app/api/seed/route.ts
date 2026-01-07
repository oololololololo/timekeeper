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

    const { error } = await supabase.from('meetings').insert(meetingsData)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
        success: true,
        message: 'Datos de demostración creados exitosamente. Vuelve al Dashboard.',
        speakersCreated: speakers.length,
        meetingsCreated: meetingsData.length
    })
}
