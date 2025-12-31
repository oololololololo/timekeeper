'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useParams, useSearchParams } from 'next/navigation'
import { clsx } from 'clsx'
import { Maximize, Bell, ScrollText } from 'lucide-react'
import ReactionSystem from '@/components/ReactionSystem'
import Teleprompter from '@/components/Teleprompter'

// Helper to format MM:SS
const fmt = (s: number) => {
    const isNeg = s < 0
    const abs = Math.abs(s)
    const m = Math.floor(abs / 60).toString().padStart(2, '0')
    const sc = Math.floor(abs % 60).toString().padStart(2, '0')
    return `${isNeg ? '-' : ''}${m}:${sc}`
}

export default function SpeakerPage() {
    const params = useParams()
    const searchParams = useSearchParams()
    const id = params.id as string
    const supabase = createClient()

    const [meeting, setMeeting] = useState<any>(null)
    const [localSeconds, setLocalSeconds] = useState(0)
    const tickerRef = useRef<NodeJS.Timeout | null>(null)
    const [audioAllowed, setAudioAllowed] = useState(false)
    const [finishedAlertPlayed, setFinishedAlertPlayed] = useState(false)
    const [toastMessage, setToastMessage] = useState<string | null>(null)
    const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // IDENTITY STATE
    const [myIdentityIndex, setMyIdentityIndex] = useState<number | null>(null)
    const [showIdentitySelector, setShowIdentitySelector] = useState(false)
    const [showTeleprompter, setShowTeleprompter] = useState(false)

    // Check LocalStorage OR URL on load
    useEffect(() => {
        const urlIdentity = searchParams.get('identity')
        const stored = localStorage.getItem(`meeting_${id}_identity`)

        if (urlIdentity !== null) {
            // URL overrides local storage for safety/correction
            const idx = Number(urlIdentity)
            setMyIdentityIndex(idx)
            localStorage.setItem(`meeting_${id}_identity`, idx.toString())
        } else if (stored !== null) {
            setMyIdentityIndex(Number(stored))
        } else {
            setShowIdentitySelector(true)
        }
    }, [id, searchParams])

    const selectIdentity = (index: number) => {
        setMyIdentityIndex(index)
        localStorage.setItem(`meeting_${id}_identity`, index.toString())
        setShowIdentitySelector(false)
    }

    const showToast = (msg: string) => {
        setToastMessage(msg)
        playAlert(true) // Optional: short ding for message

        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
        toastTimeoutRef.current = setTimeout(() => {
            setToastMessage(null)
        }, 10000) // Show for 10 seconds
    }

    // Refs for accessing fresh state in callbacks
    const meetingRef = useRef<any>(null)
    const identityRef = useRef<number | null>(null)

    useEffect(() => {
        meetingRef.current = meeting
    }, [meeting])

    useEffect(() => {
        identityRef.current = myIdentityIndex
    }, [myIdentityIndex])

    const handlePrivateMessage = (text: string) => {
        const currentIdx = meetingRef.current?.timer_state?.currentSpeakerIndex
        const myIdx = identityRef.current

        // Show if I am the speaker OR if no identity set (legacy/testing) ?? 
        // User asked for privacy, so strict check:
        // Only show if I AM the current speaker.
        if (myIdx !== null && myIdx === currentIdx) {
            showToast(text)
        }
    }

    // INITIAL FETCH & SUBSCRIPTION
    useEffect(() => {
        const fetchMeeting = async () => {
            const { data } = await supabase.from('meetings').select('*').eq('id', id).single()
            if (data) {
                setMeeting(data)
                syncLocalState(data.timer_state)
            }
        }

        fetchMeeting()

        const channel = supabase
            .channel(`meeting-${id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'meetings', filter: `id=eq.${id}` },
                (payload) => {
                    const newData = payload.new
                    setMeeting(newData)
                    syncLocalState(newData.timer_state)
                })
            .on('broadcast', { event: 'private_message' }, (payload) => {
                // Need to access current state inside callback. 
                // Since closure captures initial state, we use functional check or ref.
                // Simplified: use a Ref for current meeting state if needed, or rely on react-state update?
                // Actually, listeners inside useEffect with [] dependency won't see updated state.
                // FIX: use a ref for meeting/identity or allow re-subscription? 
                // Better: Trigger an event/state update and check in render? No, toast is transient.
                // Robust fix: Use a ref to store current meeting state and identity.
                handlePrivateMessage(payload.payload.text)
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [id])

    // SYNC LOGIC (Optimized for viewer)
    const syncLocalState = (ts: any) => {
        // If drift > 2s, snap.
        // Otherwise ignore small drifts to prevent jumping
        const diff = Math.abs(ts.remainingSeconds - localSeconds)
        if (diff > 2 || !ts.isRunning) {
            setLocalSeconds(ts.remainingSeconds)
        }

        if (ts.isRunning && !ts.isPaused) {
            startTicker()
        } else {
            stopTicker()
        }
    }

    const startTicker = () => {
        if (tickerRef.current) clearInterval(tickerRef.current)
        tickerRef.current = setInterval(() => {
            setLocalSeconds(prev => {
                const next = prev - 1
                if (next === 0) playAlert()
                return next
            })
        }, 1000)
    }

    const stopTicker = () => {
        if (tickerRef.current) clearInterval(tickerRef.current)
    }

    const playAlert = (short = false) => {
        if (!audioAllowed) return

        // Vibrate
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([200, 100, 200])
        }

        // Sound
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.connect(g)
        g.connect(ctx.destination)
        osc.frequency.value = short ? 600 : 440
        osc.type = 'sine'
        g.gain.value = 0.2
        osc.start()
        setTimeout(() => osc.stop(), short ? 200 : 500)
    }

    if (!meeting) return <div className="bg-black h-screen text-white flex items-center justify-center">Cargando...</div>

    const ts = meeting.timer_state
    const idx = ts.currentSpeakerIndex
    const currentSpeaker = meeting.speakers[idx]
    const nextSpeaker = meeting.speakers[idx + 1]
    const totalMinutes = currentSpeaker?.minutes || 5
    const progress = (localSeconds / (totalMinutes * 60)) * 100

    // SEMAPHORE LOGIC
    let bgClass = "bg-[#00b894]" // Green
    if (localSeconds <= 0) bgClass = "bg-[#d63031] animate-pulse" // Red
    else if (progress < 30) bgClass = "bg-[#d63031]" // Red static (logic from user code says red < 30%? No user code said "se agota el tiempo")
    // User code: if (rem <= 0) red; else if (pct < 30) red; else if (pct < 50) yellow; else green.
    else if (progress < 50) bgClass = "bg-[#fdcb6e]" // Yellow

    if (localSeconds <= 0) bgClass = "bg-[#d63031] animate-[pulse_1s_ease-in-out_infinite]"

    return (
        <div
            className={clsx(
                "h-screen w-full flex flex-col items-center justify-center transition-colors duration-500 overflow-hidden relative",
                bgClass,
                localSeconds < 50 && localSeconds > 0 && progress < 50 ? "text-black" : "text-white"
            )}
            onClick={() => {
                if (!audioAllowed) {
                    setAudioAllowed(true)
                    // Unlock audio context on iOS logic usually requires playing a silent buffer or resuming context
                    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
                    ctx.resume()
                }
            }}
        >
            {/* IDENTITY SELECTOR MODAL */}
            {showIdentitySelector && meeting && (
                <div className="absolute inset-0 bg-black/95 z-[70] flex flex-col items-center justify-center p-6 backdrop-blur-md">
                    <h2 className="text-2xl font-bold text-white mb-2">¿Quién eres?</h2>
                    <p className="text-gray-400 mb-6 text-center">Selecciona tu nombre para recibir mensajes privados.</p>

                    <div className="w-full max-w-md space-y-3 max-h-[60vh] overflow-y-auto">
                        {meeting.speakers.map((s: any, i: number) => (
                            <button
                                key={i}
                                onClick={(e) => { e.stopPropagation(); selectIdentity(i) }}
                                className="w-full p-4 rounded-xl bg-white/10 hover:bg-[#667eea] border border-white/10 transition flex items-center justify-between group"
                            >
                                <span className="font-bold text-lg">{s.name}</span>
                                <span className="text-sm text-gray-400 group-hover:text-white/80">{s.minutes} min</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* PRIVATE MESSAGE OVERLAY */}
            <div className={clsx(
                "absolute top-8 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl z-[60] transition-all duration-500 ease-out transform",
                toastMessage ? "translate-y-0 opacity-100" : "-translate-y-24 opacity-0 pointer-events-none"
            )}>
                <div className="bg-black/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl p-6 flex flex-col items-center text-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">Mensaje del Organizador</span>
                    <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                        {toastMessage}
                    </h2>
                </div>
            </div>
            {/* ENABLE AUDIO OVERLAY */}
            {!audioAllowed && (
                <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center">
                    <div className="text-center p-8">
                        <Bell className="w-16 h-16 mx-auto mb-4 text-white animate-bounce" />
                        <h2 className="text-2xl font-bold text-white mb-2">Activar Sonido</h2>
                        <p className="text-gray-400 mb-6">Toca la pantalla para permitir alertas sonoras</p>
                        <button onClick={() => setAudioAllowed(true)} className="bg-white text-black px-6 py-3 rounded-full font-bold">
                            Entendido
                        </button>
                    </div>
                </div>
            )}

            {/* MAIN CONTENT SWITCHER */}
            {showTeleprompter ? (
                /* TELEPROMPTER VIEW - Replaces everything */
                <Teleprompter
                    isOpen={showTeleprompter}
                    onClose={() => setShowTeleprompter(false)}
                    meetingTimeFormatted={fmt(localSeconds)}
                    timerColor={(() => {
                        if (localSeconds <= 0) return "#d63031"
                        if (progress < 30) return "#d63031"
                        if (progress < 50) return "#fdcb6e"
                        return "#00b894"
                    })()}
                    isTimerAnimated={localSeconds <= 0}
                />
            ) : (
                /* TIMER VIEW */
                <>
                    <div className="text-center z-10 flex flex-col items-center">
                        <h1 className="text-3xl md:text-5xl font-bold mb-8 opacity-90 drop-shadow-md">
                            {currentSpeaker?.name || 'Reunión Finalizada'}
                        </h1>

                        <div className="text-[28vw] md:text-[25vw] leading-none font-bold font-mono tracking-tighter drop-shadow-2xl">
                            {fmt(localSeconds)}
                        </div>

                        {nextSpeaker && (
                            <div className="absolute bottom-12 left-0 w-full text-center text-xl md:text-3xl opacity-70 font-medium">
                                Siguiente: <span className="font-bold">{nextSpeaker.name}</span>
                            </div>
                        )}
                    </div>

                    {/* TELEPROMPTER BUTTON - Only visible in Timer View */}
                    <button
                        onClick={() => setShowTeleprompter(true)}
                        className="absolute top-6 right-6 z-40 p-4 bg-white text-black hover:bg-gray-100 rounded-full transition-all group shadow-xl hover:scale-110 border-2 border-black/5"
                        title="Abrir Teleprompter"
                    >
                        <ScrollText className="w-6 h-6" />
                    </button>
                </>
            )}

            <ReactionSystem meetingId={id} />
        </div>
    )
}
