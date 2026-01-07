'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useParams } from 'next/navigation'
import { Play, Pause, SkipBack, SkipForward, RefreshCw, Maximize2, Hourglass, RotateCw, Zap, Volume2, Send } from 'lucide-react'
import { clsx } from 'clsx'
import { logSpeakerTime } from '@/app/actions/meeting-actions'
import ReactionSystem from '@/components/ReactionSystem'

// Types (should remain consistent with creation)
type TimerState = {
    isRunning: boolean
    isPaused: boolean
    remainingSeconds: number
    currentSpeakerIndex: number
    lastUpdatedAt?: string // ISO string for drift correction
}

// Helper to format MM:SS
const fmt = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sc = Math.floor(s % 60).toString().padStart(2, '0')
    return `${m}:${sc}`
}

export default function AdminPage() {
    const params = useParams()
    const id = params.id as string
    const supabase = createClient()

    const [meeting, setMeeting] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    // Local timer state to decouple from strict server polls
    const [localSeconds, setLocalSeconds] = useState(0)
    const tickerRef = useRef<NodeJS.Timeout | null>(null)

    // INITIAL FETCH & SUBSCRIPTION
    useEffect(() => {
        const fetchMeeting = async () => {
            const { data, error } = await supabase.from('meetings').select('*').eq('id', id).single()
            if (error) {
                alert('Reunión no encontrada')
                return
            }
            setMeeting(data)
            syncLocalState(data.timer_state)
            setLoading(false)
        }

        fetchMeeting()

        // Realtime Subscription
        const channel = supabase
            .channel(`meeting-${id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'meetings', filter: `id=eq.${id}` },
                (payload) => {
                    const newData = payload.new
                    setMeeting(newData)
                    // Only sync local seconds if it was an external change (not our own optimistic update ideally, 
                    // but for simplicity we sync always and handle "owner" logic if needed. 
                    // Actually, to avoid jumping creating a 'drift' check is good)
                    syncLocalState(newData.timer_state)
                })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [id])

    // SYNC LOGIC
    const syncLocalState = (ts: TimerState) => {
        let seconds = ts.remainingSeconds

        // Calculate drift if running
        if (ts.isRunning && !ts.isPaused && ts.lastUpdatedAt) {
            const now = new Date().getTime()
            const lastUpdate = new Date(ts.lastUpdatedAt).getTime()
            const elapsed = Math.floor((now - lastUpdate) / 1000)
            seconds = seconds - elapsed
        }

        setLocalSeconds(seconds)

        if (ts.isRunning && !ts.isPaused) {
            startTicker()
        } else {
            stopTicker()
        }
    }

    // TICKER
    const startTicker = () => {
        if (tickerRef.current) clearInterval(tickerRef.current)
        tickerRef.current = setInterval(() => {
            setLocalSeconds(prev => {
                if (prev <= -999) return prev // Cap
                // Allow negative (Overtime)
                return prev - 1
            })
        }, 1000)
    }

    const stopTicker = () => {
        if (tickerRef.current) clearInterval(tickerRef.current)
    }

    // ACTIONS
    const updateServer = async (partialState: Partial<TimerState>) => {
        if (!meeting) return

        const newState = { ...meeting.timer_state, ...partialState }

        // Optimistic update
        setMeeting({ ...meeting, timer_state: newState })
        syncLocalState(newState)

        await supabase.from('meetings').update({
            timer_state: newState
        }).eq('id', id)
    }

    const togglePlay = () => {
        const ts = meeting.timer_state
        if (!ts.isRunning) {
            updateServer({ isRunning: true, isPaused: false, lastUpdatedAt: new Date().toISOString() })
        } else {
            // Pausing
            // IMPORTANT: Persist the specific local second we stopped at
            updateServer({ isPaused: !ts.isPaused, remainingSeconds: localSeconds, lastUpdatedAt: !ts.isPaused ? undefined : new Date().toISOString() })
        }
    }

    // Helper to log stats
    const logCurrentStats = async () => {
        const currentIdx = meeting.timer_state.currentSpeakerIndex
        const speakers = meeting.speakers || []
        if (currentIdx >= 0 && currentIdx < speakers.length) {
            const currentSpeaker = speakers[currentIdx]
            const allocatedSecs = (currentSpeaker.minutes || 5) * 60
            const spokenSecs = allocatedSecs - localSeconds

            if (spokenSecs > 0) {
                await logSpeakerTime(
                    id,
                    currentSpeaker.speaker_id || null,
                    Math.max(0, spokenSecs),
                    allocatedSecs,
                    currentSpeaker.name,
                    currentSpeaker.email
                )
            }
        }
    }

    const changeSpeaker = async (offset: number) => {
        const currentIdx = meeting.timer_state.currentSpeakerIndex
        const nextIdx = currentIdx + offset
        const speakers = meeting.speakers || []

        // Log previous
        if (currentIdx >= 0 && currentIdx < speakers.length) {
            await logCurrentStats()
        }

        if (nextIdx >= 0 && nextIdx < speakers.length) {
            // Save actual time for previous speaker (TODO)
            updateServer({
                currentSpeakerIndex: nextIdx,
                remainingSeconds: speakers[nextIdx].minutes * 60,
                isRunning: true, // Auto-start? Or wait? user pref. Let's auto-start for flow
                isPaused: false,
                lastUpdatedAt: new Date().toISOString()
            })
        }
    }

    const resetSpeaker = () => {
        const currentIdx = meeting.timer_state.currentSpeakerIndex
        const speakers = meeting.speakers || []
        updateServer({
            remainingSeconds: speakers[currentIdx].minutes * 60,
            isRunning: false,
            isPaused: false
        })
    }

    const finishMeeting = async () => {
        if (!confirm('¿Estás seguro de finalizar la reunión? Esto guardará las métricas finales.')) return

        await logCurrentStats()

        await supabase.from('meetings').update({ status: 'finished' }).eq('id', id)
        setMeeting({ ...meeting, status: 'finished' })
        updateServer({ isRunning: false, isPaused: true })
        alert('Reunión finalizada y métricas guardadas.')
    }

    // PRIVATE MESSAGING
    const [msgInput, setMsgInput] = useState('')
    const sendMessage = async (text: string) => {
        await supabase.channel(`meeting-${id}`).send({
            type: 'broadcast',
            event: 'private_message',
            payload: { text }
        })
        // Optional: show local feedback "Sent"
    }

    // Detect Mini Mode
    const [isMiniMode, setIsMiniMode] = useState(false)
    useEffect(() => {
        if (typeof window !== 'undefined' && (window.name === 'MiniTimer' || window.innerWidth < 450)) {
            setIsMiniMode(true)
        }
    }, [])

    if (loading) return <div className="text-white p-10">Cargando...</div>

    const ts = meeting?.timer_state || {}
    const currentSpeaker = meeting?.speakers[ts.currentSpeakerIndex]
    const isRunning = ts.isRunning && !ts.isPaused

    // Mini Mode Layout
    if (isMiniMode) {
        return (
            <div className="h-screen bg-[#1a1a2e] text-white flex flex-col items-center justify-center p-4 overflow-hidden relative">
                {/* Drag Region (Optional aesthetics) */}
                <div className="absolute top-0 left-0 w-full h-8 bg-white/5 active:bg-white/10" style={{ WebkitAppRegion: 'drag' } as any} />

                <div className="w-full text-center mt-4">
                    <div className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Hablando</div>
                    <div className="text-2xl font-bold truncate px-2 text-white/90">
                        {currentSpeaker?.name || 'Finalizado'}
                    </div>
                </div>

                <div className={clsx(
                    "flex-1 flex items-center justify-center font-mono font-bold tabular-nums my-4 relative z-10",
                    localSeconds < 0 ? "text-red-500" : localSeconds < 60 ? "text-yellow-400" : "text-[#00ff88]"
                )} style={{ fontSize: '5rem', lineHeight: 1 }}>
                    {fmt(Math.abs(localSeconds))}
                </div>

                <div className="w-full grid grid-cols-3 gap-3 px-2 mb-4">
                    <button onClick={() => changeSpeaker(-1)} className="flex items-center justify-center p-4 rounded-xl bg-white/10 hover:bg-white/20 transition">
                        <SkipBack size={20} />
                    </button>

                    <button
                        onClick={togglePlay}
                        className={clsx(
                            "flex items-center justify-center rounded-xl font-bold transition shadow-lg active:scale-95",
                            isRunning ? "bg-yellow-500 text-black" : "bg-[#00ff88] text-black"
                        )}
                    >
                        {isRunning ? <Pause size={24} fill="black" /> : <Play size={24} fill="black" />}
                    </button>

                    <button onClick={() => changeSpeaker(1)} className="flex items-center justify-center p-4 rounded-xl bg-white/10 hover:bg-white/20 transition">
                        <SkipForward size={20} />
                    </button>
                </div>

                <button onClick={resetSpeaker} className="text-xs text-gray-600 hover:text-gray-400 flex items-center gap-1 mb-2">
                    <RefreshCw size={10} /> Reiniciar
                </button>
            </div>
        )
    }

    // Default Layout
    return (
        <div className="h-screen bg-[#1a1a2e] text-white flex flex-col md:flex-row overflow-hidden">

            {/* MAIN TIMER PANEL */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
                {/* Header */}
                <div className="absolute top-6 w-full px-8 flex justify-between items-center">
                    <div>
                        <h2 className="text-gray-400 text-sm tracking-widest uppercase">REUNIÓN</h2>
                        <h1 className="text-xl font-bold">{meeting.title}</h1>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={finishMeeting}
                            className="text-red-400 border border-red-500/30 hover:bg-red-500/10 rounded-lg px-4 py-2 text-sm font-bold transition"
                        >
                            Finalizar Reunión
                        </button>
                        <button
                            onClick={() => window.open(window.location.href, 'MiniTimer', 'popup=yes,width=360,height=420,toolbar=no,location=no,status=no,menubar=no')}
                            className="text-gray-400 hover:text-white flex items-center gap-2 text-sm border border-white/20 rounded-lg px-3 py-2 hover:bg-white/5 transition"
                        >
                            <Maximize2 size={16} /> Mini Mode
                        </button>
                    </div>
                </div>

                {/* Timer Card */}
                <div className="bg-white/5 border border-white/10 rounded-[3rem] p-12 w-full max-w-2xl text-center shadow-2xl backdrop-blur-sm">
                    <div className="text-gray-400 text-sm mb-4 uppercase tracking-wider">Hablando Ahora</div>
                    <div className="text-4xl md:text-5xl font-bold mb-8 truncate text-white">
                        {currentSpeaker?.name || 'Finalizado'}
                    </div>

                    <div className={clsx(
                        "text-8xl md:text-9xl font-mono font-bold mb-10 tabular-nums transition-colors",
                        localSeconds < 0 ? "text-red-500" :
                            localSeconds < 60 ? "text-yellow-400" : "text-[#00ff88]"
                    )}>
                        {fmt(Math.abs(localSeconds))}
                        {localSeconds < 0 && <span className="text-xl align-top">+</span>}
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-4">
                        <button onClick={() => changeSpeaker(-1)} className="p-4 rounded-xl bg-white/10 hover:bg-white/20 transition">
                            <SkipBack />
                        </button>

                        <button
                            onClick={togglePlay}
                            className={clsx(
                                "py-4 px-12 rounded-2xl font-bold text-xl flex items-center gap-3 transition transform active:scale-95 shadow-lg",
                                isRunning ? "bg-yellow-500 text-black hover:bg-yellow-400" : "bg-[#00ff88] text-black hover:bg-[#00e676]"
                            )}
                        >
                            {isRunning ? <><Pause fill="black" /> Pausar</> : <><Play fill="black" /> Iniciar</>}
                        </button>

                        <button onClick={() => changeSpeaker(1)} className="p-4 rounded-xl bg-white/10 hover:bg-white/20 transition">
                            <SkipForward />
                        </button>
                    </div>

                    <button onClick={resetSpeaker} className="mt-8 text-sm text-gray-500 hover:text-white flex items-center justify-center gap-2 w-full">
                        <RefreshCw size={14} /> Reiniciar este orador
                    </button>
                </div>

                {/* PRIVATE MESSAGING PANEL */}
                <div className="w-full max-w-2xl mt-8">
                    <h3 className="text-gray-400 uppercase text-xs font-bold mb-3 tracking-widest text-center">Mensajes al Orador</h3>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                            <button onClick={() => sendMessage('Te quedan 5 minutos')} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition group border border-transparent hover:border-white/10">
                                <Hourglass className="text-[#667eea] group-hover:scale-110 transition w-6 h-6" />
                                <span className="text-xs font-bold text-gray-300">Quedan 5m</span>
                            </button>
                            <button onClick={() => sendMessage('Redondea la idea')} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition group border border-transparent hover:border-white/10">
                                <RotateCw className="text-yellow-400 group-hover:scale-110 transition w-6 h-6" />
                                <span className="text-xs font-bold text-gray-300">Redondea</span>
                            </button>
                            <button onClick={() => sendMessage('Acelera un poco')} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition group border border-transparent hover:border-white/10">
                                <Zap className="text-orange-400 group-hover:scale-110 transition w-6 h-6" />
                                <span className="text-xs font-bold text-gray-300">Acelera</span>
                            </button>
                            <button onClick={() => sendMessage('Acércate al micrófono')} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition group border border-transparent hover:border-white/10">
                                <Volume2 className="text-green-400 group-hover:scale-110 transition w-6 h-6" />
                                <span className="text-xs font-bold text-gray-300">Audio Bajo</span>
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Escribe un mensaje personalizado..."
                                className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#667eea] transition text-white placeholder-gray-500"
                                value={msgInput}
                                onChange={(e) => setMsgInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && msgInput) { sendMessage(msgInput); setMsgInput('') } }}
                            />
                            <button
                                onClick={() => { if (msgInput) { sendMessage(msgInput); setMsgInput('') } }}
                                disabled={!msgInput}
                                className="p-3 bg-[#667eea] rounded-xl hover:bg-[#5a6fd6] disabled:opacity-50 disabled:cursor-not-allowed transition text-white shadow-lg"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <ReactionSystem meetingId={id} />

            {/* SIDEBAR LIST */}
            <div className="w-full md:w-80 bg-white/5 border-l border-white/10 p-6 overflow-y-auto hidden md:block">
                <h3 className="text-gray-400 uppercase text-xs font-bold mb-6 tracking-widest">Participantes</h3>
                <div className="space-y-3">
                    {meeting.speakers.map((s: any, i: number) => (
                        <div
                            key={i}
                            onClick={() => changeSpeaker(i - ts.currentSpeakerIndex)} // Calculate offset
                            className={clsx(
                                "p-4 rounded-xl cursor-pointer transition flex items-center justify-between border",
                                i === ts.currentSpeakerIndex
                                    ? "bg-[#667eea]/20 border-[#667eea] shadow-[0_0_15px_rgba(102,126,234,0.3)]"
                                    : "bg-white/5 border-transparent hover:bg-white/10",
                                i < ts.currentSpeakerIndex && "opacity-50"
                            )}
                        >
                            <span className="font-semibold">{s.name}</span>
                            <span className="text-sm font-mono text-gray-400">{s.minutes} min</span>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    )
}
