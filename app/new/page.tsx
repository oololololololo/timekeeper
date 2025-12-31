'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { addSpeaker } from '@/app/dashboard/speakers/actions'
import { Plus, X, Clock, Calendar, Hash, Calculator, CircleDollarSign, CheckCircle, Users, Rocket, Timer, Save, Trash2 } from 'lucide-react'
import { DatePicker } from '@/components/ui/date-picker'
import { TimePicker } from '@/components/ui/time-picker'
import { addMinutes, format } from 'date-fns'
import { es } from 'date-fns/locale'

type Participant = {
    name: string
    email: string
    minutes: number
    topic?: string
    speaker_id?: string // Link to registered speaker
}

type CostData = {
    attendees: number
    avgMonthlyCost: number
    estimatedReturn: string
    objective: string
    extraCosts: number
    shareCost: boolean
}

export default function CreateMeeting() {
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = useState(false)
    const [createdMeetingId, setCreatedMeetingId] = useState<string | null>(null)
    const [meetingName, setMeetingName] = useState('')
    const [adminEmail, setAdminEmail] = useState('')
    // State for Custom Pickers
    const [startDate, setStartDate] = useState<Date | undefined>(undefined)
    const [startTime, setStartTime] = useState('')

    const [participants, setParticipants] = useState<Participant[]>([
        { name: '', email: '', minutes: 5, topic: '' },
        { name: '', email: '', minutes: 5, topic: '' }
    ])

    // Cost Popup State
    const [showCostPopup, setShowCostPopup] = useState(false)
    const [wizardStep, setWizardStep] = useState(0) // 0: Intro, 1: Attendees, 2: Salary, 3: Objective, 4: Extras, 5: Summary
    const [costData, setCostData] = useState<CostData>({
        attendees: 0,
        avgMonthlyCost: 0,
        estimatedReturn: '',
        objective: '',
        extraCosts: 0,
        shareCost: false
    })

    // Auto-sync attendees count when opening wizard if 0
    useEffect(() => {
        if (showCostPopup && costData.attendees === 0) {
            setCostData(prev => ({ ...prev, attendees: participants.length }))
        }
    }, [showCostPopup, participants.length])

    // Confirmation Modal State
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [showResetConfirmModal, setShowResetConfirmModal] = useState(false)



    // Speakers Fetching (State & Logic)
    const [savedSpeakers, setSavedSpeakers] = useState<any[]>([])
    const [suggestionsActive, setSuggestionsActive] = useState<{ index: number, filtered: any[] } | null>(null)
    const [autoSaveSpeakers, setAutoSaveSpeakers] = useState(false)
    const [isLoggedIn, setIsLoggedIn] = useState(false)

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setIsLoggedIn(true)
                setAutoSaveSpeakers(true)
                fetchSpeakers()
            }
        }
        checkUser()
    }, [])

    const handleNameChange = (index: number, value: string) => {
        updateParticipant(index, 'name', value)
        if (value.length > 0 && savedSpeakers.length > 0) {
            const filtered = savedSpeakers.filter(s => s.name.toLowerCase().includes(value.toLowerCase()))
            if (filtered.length > 0) {
                setSuggestionsActive({ index, filtered })
            } else {
                setSuggestionsActive(null)
            }
        } else {
            setSuggestionsActive(null)
        }
    }

    const selectSpeaker = (index: number, speaker: any) => {
        const newParticipants = [...participants]
        newParticipants[index].name = speaker.name
        newParticipants[index].email = speaker.email || ''
        newParticipants[index].speaker_id = speaker.id
        // If we had cost per speaker logic in this form, we would set it here too
        setParticipants(newParticipants)
        setSuggestionsActive(null)
    }

    // Helpers
    const addParticipant = () => {
        setParticipants([...participants, { name: '', email: '', minutes: 5, topic: '' }])
    }

    const removeParticipant = (index: number) => {
        if (participants.length > 1) {
            setParticipants(participants.filter((_, i) => i !== index))
        }
    }

    const updateParticipant = (index: number, field: keyof Participant, value: string | number) => {
        const newParticipants = [...participants]
        // @ts-ignore
        newParticipants[index][field] = value
        setParticipants(newParticipants)
    }

    const handleCreateClick = (e: React.FormEvent) => {
        e.preventDefault()
        if (!meetingName) return alert('El nombre de la reunión es obligatorio')
        if (!startDate || !startTime) return alert('La fecha y hora de inicio son obligatorias')
        if (!adminEmail) return alert('El email del organizador es obligatorio')

        // If costs not reviewed, ask user
        if (!showCostPopup && costData.attendees === 0) {
            setShowConfirmModal(true)
            return
        }

        createMeeting()
    }

    const createMeeting = async () => {
        setLoading(true)
        const shortId = Math.random().toString(36).substring(2, 10).toUpperCase()

        // Combine Date + Time
        const fullStartDate = new Date(startDate!)
        const [h, m] = startTime.split(':')
        fullStartDate.setHours(Number(h), Number(m))
        const startIso = fullStartDate.toISOString()

        // AUTO-SAVE SPEAKERS Logic
        let finalParticipants = [...participants]
        if (autoSaveSpeakers) {
            const formDataProto = new FormData() // Mock for server action reuse if needed, or better call specialized fn
            // We need to iterate async
            const updatedParticipants = await Promise.all(finalParticipants.map(async (p) => {
                // If it has name and email but NO speaker_id, try to save
                if (p.name && !p.speaker_id) {
                    try {
                        const fd = new FormData()
                        fd.append('name', p.name)
                        if (p.email) fd.append('email', p.email)
                        // Explicitly call the server action
                        const res = await addSpeaker(fd)
                        if (res?.success && res.id) {
                            return { ...p, speaker_id: res.id }
                        }
                    } catch (err) {
                        console.error('Failed to auto-save speaker', p.name, err)
                    }
                }
                return p
            }))
            finalParticipants = updatedParticipants
        }

        // Construct End Date Object based on total duration of speakers
        const totalMinutes = finalParticipants.reduce((acc, p) => acc + (p.minutes || 0), 0)
        const endDateObj = addMinutes(fullStartDate, totalMinutes)
        const endIso = endDateObj.toISOString()

        // Create record
        const { error } = await supabase.from('meetings').insert({
            id: shortId,
            host_id: (await supabase.auth.getUser()).data.user?.id || null, // Ensure host_id is set
            title: meetingName,
            status: 'scheduled',
            speakers: finalParticipants,
            meta: { ...costData, startDate: startIso, endDate: endIso },
            timer_state: {
                isRunning: false,
                isPaused: false,
                remainingSeconds: (finalParticipants[0]?.minutes || 5) * 60,
                currentSpeakerIndex: 0
            }
        })

        if (error) {
            console.error(error)
            alert('Error creando reunión: ' + error.message)
            setLoading(false)
            return
        }

        // Calculate Total Cost before sending (re-calc to be sure or use state if extracted)
        const totalMinutesCall = participants.reduce((acc, p) => acc + (p.minutes || 0), 0)
        const hourlyRateCall = (costData.avgMonthlyCost || 0) / 22 / 8
        const timeCostCall = (costData.attendees || 0) * hourlyRateCall * (totalMinutesCall / 60)
        const totalCostCall = timeCostCall + (costData.extraCosts || 0)

        // TRIGGER EMAIL SENDING (Async - don't block UI)
        fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                meetingId: shortId,
                meetingName,
                participants,
                startDate: startIso,
                endDate: endIso,
                adminEmail,
                costData: (totalCostCall > 0 && costData.shareCost) ? {
                    totalCost: totalCostCall,
                    objective: costData.objective,
                    returnText: costData.estimatedReturn
                } : null
            })
        }).catch(err => console.error('Error sending emails:', err))

        setLoading(false)
        setCreatedMeetingId(shortId)
    }

    // Calculate Total Cost
    const totalMinutes = participants.reduce((acc, p) => acc + (p.minutes || 0), 0)
    // Formula: Monthly Cost / 22 days / 9 hours
    const hourlyRate = (costData.avgMonthlyCost || 0) / 22 / 8
    const timeCost = (costData.attendees || 0) * hourlyRate * (totalMinutes / 60)
    const totalCost = timeCost + (costData.extraCosts || 0)

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount)
    }

    // Extracted fetch function to reuse
    const fetchSpeakers = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data } = await supabase.from('speakers').select('*').order('name')
            if (data) setSavedSpeakers(data)
        }
    }

    // RESET LOGIC
    const handleReset = (keepParticipants: boolean) => {
        setCreatedMeetingId(null)
        setMeetingName('')
        if (!keepParticipants) {
            setParticipants([
                { name: '', email: '', minutes: 5, topic: '' },
                { name: '', email: '', minutes: 5, topic: '' }
            ])
        }
        // Keep cost data? maybe reset
        // setCostData(...)
        window.scrollTo({ top: 0, behavior: 'smooth' })

        // Refetch speakers to ensure new ones appear in autocomplete
        if (isLoggedIn) fetchSpeakers()
    }

    // SUCCESS VIEW
    if (createdMeetingId) {
        return (
            <div className="min-h-screen bg-[#1a1a2e] text-white flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-green-500/20 text-green-400 p-6 rounded-full mb-6 animate-bounce">
                    <CheckCircle className="w-16 h-16" />
                </div>
                <h1 className="text-4xl font-bold mb-4">¡Reunión Lista!</h1>
                <p className="text-gray-400 mb-8 max-w-md">Comparte estos enlaces con los participantes y el moderador.</p>

                <div className="w-full max-w-md space-y-4">
                    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl text-left">
                        <div className="text-xs uppercase text-green-400 font-bold tracking-widest mb-2">MODERADOR (TÚ)</div>
                        <div className="flex gap-2">
                            <input readOnly value={`${window.location.origin}/${createdMeetingId}/admin`} className="bg-black/30 flex-1 p-3 rounded-lg text-sm font-mono text-gray-300 outline-none" onClick={e => e.currentTarget.select()} />
                            <button
                                onClick={() => router.push(`/${createdMeetingId}/admin`)}
                                className="bg-[#667eea] hover:bg-[#5a6fd6] text-white px-4 py-2 rounded-lg font-bold transition"
                            >
                                Ir
                            </button>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl text-left">
                        <div className="text-xs uppercase text-orange-400 font-bold tracking-widest mb-2">ORADORES (PANTALLA)</div>
                        <div className="flex gap-2">
                            <input readOnly value={`${window.location.origin}/${createdMeetingId}/speaker`} className="bg-black/30 flex-1 p-3 rounded-lg text-sm font-mono text-gray-300 outline-none" onClick={e => e.currentTarget.select()} />
                            <button
                                onClick={() => window.open(`/${createdMeetingId}/speaker`, '_blank')}
                                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-bold border border-white/20 transition"
                            >
                                Abrir
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-12 flex flex-col gap-4">
                    <button onClick={() => handleReset(true)} className="text-gray-400 hover:text-white underline">
                        Crear otra reunión (Mantener oradores)
                    </button>
                    <button onClick={() => handleReset(false)} className="text-sm text-gray-600 hover:text-gray-400">
                        Crear nueva desde cero
                    </button>
                    <Link href="/dashboard" className="text-sm text-[#667eea] hover:text-white mt-4 block">
                        Volver al Dashboard
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#0f3460] text-white font-sans p-6 flex flex-col items-center relative">

            <Link href="/dashboard" className="absolute top-6 left-6 text-gray-400 hover:text-white flex items-center gap-2 text-sm transition">
                ← <span className="hidden sm:inline">Dashboard</span>
            </Link>

            {/* HEADER */}
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent flex items-center gap-3">
                <Timer className="w-10 h-10 text-[#667eea]" /> TimeKeeper
            </h1>
            <p className="text-gray-400 mb-8">Diseña reuniones ágiles y con impacto</p>

            {/* FORM CARD */}
            <form onSubmit={handleCreateClick} className="w-full max-w-3xl bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm shadow-2xl">

                {/* BASIC INFO */}
                <div className="grid gap-6 mb-8">
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">Nombre de la Reunión</label>
                        <input
                            type="text"
                            placeholder="Ej. Weekly Sync"
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-[#667eea] transition placeholder-gray-600"
                            value={meetingName}
                            onChange={e => setMeetingName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Fecha de Inicio</label>
                            <DatePicker
                                date={startDate}
                                setDate={setStartDate}
                                placeholder="Seleccionar fecha..."
                                showTime={false}
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Hora de Inicio</label>
                            <div className="flex flex-col">
                                <TimePicker
                                    value={startTime}
                                    onChange={setStartTime}
                                    placeholder="00:00"
                                />
                                {startTime && startDate && (
                                    <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Fin estimado: {(() => {
                                            const d = new Date(startDate)
                                            const [h, m] = startTime.split(':')
                                            d.setHours(Number(h), Number(m))
                                            return format(addMinutes(d, totalMinutes), "HH:mm", { locale: es })
                                        })()}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Email Organizador</label>
                            <input
                                type="email"
                                placeholder="tu@email.com"
                                className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-[#667eea] transition placeholder-gray-600"
                                value={adminEmail}
                                onChange={e => setAdminEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="flex items-center justify-between bg-black/20 border border-white/10 rounded-xl p-4 cursor-pointer hover:bg-white/5 transition border-dashed cursor-pointer" onClick={() => setShowCostPopup(true)}>
                            <div className="flex items-center gap-2 text-gray-300">
                                <CircleDollarSign className="w-5 h-5 text-green-400" />
                                <span>Calcular Costos</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SPEAKERS */}
                <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-gray-400" /> Oradores
                        <span className="text-sm font-normal text-gray-500 bg-black/30 px-2 py-1 rounded-full">{participants.length}</span>
                    </h3>

                    <div className="space-y-3">
                        {participants.map((p, i) => (
                            <div key={i} className={`relative flex flex-col md:flex-row gap-3 items-center group bg-white/5 p-3 rounded-xl border border-white/5 hover:border-white/10 transition ${suggestionsActive?.index === i ? 'z-50' : 'z-10'}`}>
                                <span className="text-gray-500 font-mono w-6 text-center">{i + 1}.</span>

                                <div className="flex-1 w-full relative">
                                    <input
                                        type="text"
                                        placeholder="Nombre"
                                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm focus:border-[#667eea] outline-none placeholder-gray-600"
                                        value={p.name}
                                        onChange={(e) => handleNameChange(i, e.target.value)}
                                        onFocus={(e) => handleNameChange(i, e.target.value)}
                                        onBlur={() => setTimeout(() => setSuggestionsActive(null), 200)} // Delay to allow click
                                        required
                                        autoComplete="off"
                                    />
                                    {/* SUGGESTIONS DROPDOWN */}
                                    {suggestionsActive?.index === i && suggestionsActive.filtered.length > 0 && (
                                        <div className="absolute top-full left-0 w-full bg-[#1e1e2f] border border-white/10 rounded-b-xl shadow-2xl z-50 max-h-60 overflow-y-auto overflow-x-hidden">
                                            {suggestionsActive.filtered.map((s, idx) => (
                                                <div
                                                    key={s.id}
                                                    className={`p-3 cursor-pointer flex items-center gap-3 transition-colors border-b border-white/5 last:border-0 ${idx === 0 ? 'bg-white/5' : 'hover:bg-white/5'}`}
                                                    onMouseDown={() => selectSpeaker(i, s)}
                                                >
                                                    <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center text-xs font-bold text-white shadow-sm">
                                                        {s.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-medium text-sm text-gray-200 truncate">{s.name}</span>
                                                        {s.email && <span className="text-xs text-gray-500 truncate">{s.email}</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <input
                                    type="email"
                                    placeholder="Email (opcional)"
                                    className="flex-1 w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm focus:border-[#667eea] outline-none placeholder-gray-600"
                                    value={p.email}
                                    onChange={(e) => updateParticipant(i, 'email', e.target.value)}
                                />
                                <input
                                    type="text"
                                    placeholder="Tema (Opcional)"
                                    className="flex-1 w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm focus:border-[#667eea] outline-none placeholder-gray-600"
                                    value={p.topic || ''}
                                    onChange={(e) => updateParticipant(i, 'topic', e.target.value)}
                                />
                                <input
                                    type="number"
                                    placeholder="Min"
                                    className="w-full md:w-24 bg-black/20 border border-white/10 rounded-lg p-3 text-sm focus:border-[#667eea] outline-none text-center"
                                    value={p.minutes}
                                    onChange={(e) => updateParticipant(i, 'minutes', Number(e.target.value))}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => removeParticipant(i)}
                                    className="w-full md:w-10 h-10 flex items-center justify-center rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition md:opacity-0 md:group-hover:opacity-100"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={addParticipant}
                        className="mt-4 w-full py-3 border border-dashed border-white/20 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Agregar Orador
                    </button>
                </div>

                {/* Auto-Save Option */}
                {isLoggedIn ? (
                    <div className="mb-6 flex items-center gap-2 px-1">
                        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${autoSaveSpeakers ? 'bg-[#667eea] border-[#667eea]' : 'bg-transparent border-white/20'}`}>
                                {autoSaveSpeakers && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <input
                                type="checkbox"
                                checked={autoSaveSpeakers}
                                onChange={(e) => setAutoSaveSpeakers(e.target.checked)}
                                className="hidden"
                            />
                            <span className={autoSaveSpeakers ? 'text-white' : ''}>Guardar oradores nuevos en mi directorio automáticamente</span>
                        </label>
                    </div>
                ) : (
                    <div className="mb-6 px-1 text-sm text-gray-500 italic">
                        <Link href="/login" className="text-[#667eea] hover:underline">Inicia sesión</Link> para guardar tus oradores automáticamente.
                    </div>
                )}

                {/* ACTIONS */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#667eea] hover:bg-[#5a6fd6] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#667eea]/20 transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? (
                        'Creando Reunión...'
                    ) : (
                        <>
                            <Rocket className="w-5 h-5" /> Lanzar Reunión
                        </>
                    )}
                </button>

                {/* COST PREVIEW */}
                {totalCost > 0 && (
                    <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-xl text-center animate-fade-in relative">
                        <div className="absolute top-4 right-4 group">
                            <button
                                type="button"
                                onClick={() => setShowResetConfirmModal(true)}
                                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition"
                                title="Borrar y recalcular"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="text-gray-400 text-sm mb-1 uppercase tracking-wider font-bold">Costo Estimado de la Reunión</div>
                        <div className="text-3xl font-bold text-green-400 flex items-center justify-center gap-2">
                            {formatCurrency(totalCost)}
                            <span className="text-xs text-gray-500 font-normal bg-black/30 px-2 py-1 rounded-full">
                                {totalMinutes} min • {costData.attendees} personas
                            </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                            (Base: {formatCurrency(costData.avgMonthlyCost)}/mes avg. por persona)
                        </div>
                    </div>
                )
                }

            </form >

            {/* CONFIRMATION MODAL */}
            {
                showConfirmModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-[#1a1a2e] border border-white/10 w-full max-w-sm rounded-2xl p-6 shadow-2xl text-center">
                            <div className="bg-yellow-500/20 text-yellow-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CircleDollarSign />
                            </div>
                            <h3 className="text-xl font-bold mb-2">¿Calcular Costos?</h3>
                            <p className="text-gray-400 text-sm mb-6">Esta reunión tiene un costo oculto. ¿Quieres estimarlo antes de lanzarla?</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowConfirmModal(false)
                                        createMeeting()
                                    }}
                                    className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-bold transition"
                                >
                                    No, omitir
                                </button>
                                <button
                                    onClick={() => {
                                        setShowConfirmModal(false)
                                        setShowCostPopup(true)
                                    }}
                                    className="flex-1 bg-[#667eea] hover:bg-[#5a6fd6] text-white py-3 rounded-xl font-bold transition"
                                >
                                    Sí, calcular
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* RESET COSTS CONFIRMATION MODAL */}
            {showResetConfirmModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1a1a2e] border border-red-500/30 w-full max-w-sm rounded-2xl p-6 shadow-2xl text-center animate-fade-in ring-1 ring-red-500/20">
                        <div className="bg-red-500/20 text-red-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 />
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-white">¿Borrar Costos?</h3>
                        <p className="text-gray-400 text-sm mb-6">Se eliminará toda la configuración financiera de esta reunión. Esta acción no se puede deshacer.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowResetConfirmModal(false)}
                                className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-bold transition border border-white/5"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    setCostData({
                                        attendees: 0,
                                        avgMonthlyCost: 0,
                                        estimatedReturn: '',
                                        objective: '',
                                        extraCosts: 0,
                                        shareCost: false
                                    })
                                    setWizardStep(0)
                                    setShowResetConfirmModal(false)
                                }}
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold transition shadow-lg shadow-red-500/20"
                            >
                                Sí, borrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* COST WIZARD POPUP */}
            {
                showCostPopup && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-[#1a1a2e] border border-white/10 w-full max-w-lg rounded-2xl p-8 shadow-2xl relative flex flex-col min-h-[400px]">

                            {/* HEADER & CLOSE */}
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-2 text-green-400">
                                    <CircleDollarSign className="w-6 h-6" />
                                    <span className="font-bold text-lg">Calculadora de Impacto</span>
                                </div>
                                <button
                                    onClick={() => setShowCostPopup(false)}
                                    className="text-gray-500 hover:text-white transition"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* PROGRESS BAR */}
                            {wizardStep > 0 && wizardStep < 5 && (
                                <div className="w-full h-1 bg-white/10 rounded-full mb-6">
                                    <div
                                        className="h-full bg-green-500 rounded-full transition-all duration-300"
                                        style={{ width: `${(wizardStep / 5) * 100}%` }}
                                    />
                                </div>
                            )}

                            {/* STEPS CONTENT */}
                            <div className="flex-1 flex flex-col justify-center animate-fade-in">

                                {/* STEP 0: INTRO */}
                                {wizardStep === 0 && (
                                    <div className="text-center">
                                        <div className="bg-red-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-400 text-3xl">😱</div>
                                        <h2 className="text-2xl font-bold mb-4">¿Sabías que una reunión mal planificada es quemar dinero en vivo?</h2>
                                        <p className="text-gray-400 mb-8 leading-relaxed">
                                            TimeKeeper te ayuda a calcular el costo oculto de juntar a tu equipo.
                                            Visualiza la inversión real y asegúrate de que valga la pena cada minuto.
                                        </p>
                                        <button
                                            onClick={() => setWizardStep(1)}
                                            className="w-full bg-[#667eea] hover:bg-[#5a6fd6] text-white font-bold py-4 rounded-xl shadow-lg transition transform hover:scale-105"
                                        >
                                            Calcular Costos
                                        </button>
                                    </div>
                                )}

                                {/* STEP 1: ATTENDEES */}
                                {wizardStep === 1 && (
                                    <div>
                                        <label className="block text-xl font-bold mb-2">¿Cuántas personas participan?</label>
                                        <p className="text-gray-400 text-sm mb-6">Incluye a todos, incluso si solo entran de oyentes.</p>

                                        <input
                                            type="number"
                                            autoFocus
                                            className="w-full text-4xl bg-black/30 border border-white/10 rounded-xl p-6 text-center text-white focus:border-green-500 outline-none font-bold"
                                            value={costData.attendees}
                                            onChange={(e) => setCostData({ ...costData, attendees: Number(e.target.value) })}
                                        />
                                    </div>
                                )}

                                {/* STEP 2: SALARY */}
                                {wizardStep === 2 && (
                                    <div>
                                        <label className="block text-xl font-bold mb-2">¿Cuál es el Costo Empresa Promedio?</label>
                                        <p className="text-gray-400 text-sm mb-6">El costo mensual promedio por persona (Sueldo Bruto + Leyes Sociales).</p>

                                        <div className="relative mb-4">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xl">$</span>
                                            <input
                                                type="number"
                                                autoFocus
                                                className="w-full text-3xl bg-black/30 border border-white/10 rounded-xl p-6 pl-12 text-white focus:border-green-500 outline-none font-bold"
                                                placeholder="Ej. 1500000"
                                                value={costData.avgMonthlyCost || ''}
                                                onChange={(e) => setCostData({ ...costData, avgMonthlyCost: Number(e.target.value) })}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setCostData({ ...costData, avgMonthlyCost: 650000 })}
                                            className="text-sm text-[#667eea] hover:underline flex items-center gap-1"
                                        >
                                            <CircleDollarSign className="w-3 h-3" /> Usar Sueldo Mínimo Referencial (~$650.000)
                                        </button>
                                    </div>
                                )}

                                {/* STEP 3: OBJECTIVE */}
                                {wizardStep === 3 && (
                                    <div>
                                        <label className="block text-xl font-bold mb-2">¿Para qué nos reunimos?</label>
                                        <p className="text-gray-400 text-sm mb-6">Define un objetivo claro. Si no hay objetivo, no debería haber reunión.</p>

                                        <textarea
                                            autoFocus
                                            className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white h-32 focus:border-green-500 outline-none text-lg resize-none mb-4"
                                            placeholder="Ej. Definir roadmap Q3..."
                                            value={costData.objective}
                                            onChange={(e) => setCostData({ ...costData, objective: e.target.value })}
                                        />

                                        <div className="flex flex-col gap-3">
                                            <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${costData.estimatedReturn === 'No tiene retorno directo asociado' ? 'bg-green-500/10 border-green-500' : 'bg-black/20 border-white/5 hover:bg-white/5'}`}>
                                                <input
                                                    type="checkbox"
                                                    className="hidden"
                                                    onChange={(e) => setCostData({ ...costData, estimatedReturn: e.target.checked ? 'No tiene retorno directo asociado' : '' })}
                                                    checked={costData.estimatedReturn === 'No tiene retorno directo asociado'}
                                                />
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${costData.estimatedReturn === 'No tiene retorno directo asociado' ? 'bg-green-500 border-green-500' : 'border-gray-500'}`}>
                                                    {costData.estimatedReturn === 'No tiene retorno directo asociado' && <CheckCircle className="w-3 h-3 text-black" />}
                                                </div>
                                                <span className="text-sm text-gray-300">Es una reunión informativa / No tiene ROI directo</span>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {/* STEP 4: EXTRAS */}
                                {wizardStep === 4 && (
                                    <div>
                                        <label className="block text-xl font-bold mb-2">¿Hay costos extra?</label>
                                        <p className="text-gray-400 text-sm mb-6">Arriendo de sala, coffee break, licencias, etc.</p>

                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xl">$</span>
                                            <input
                                                type="number"
                                                className="w-full text-3xl bg-black/30 border border-white/10 rounded-xl p-6 pl-12 text-white focus:border-green-500 outline-none font-bold"
                                                placeholder="0"
                                                value={costData.extraCosts || ''}
                                                onChange={(e) => setCostData({ ...costData, extraCosts: Number(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* STEP 5: SUMMARY */}
                                {wizardStep === 5 && (
                                    <div className="text-center">
                                        <h3 className="text-gray-400 uppercase tracking-widest text-sm font-bold mb-2">Costo Total Estimado</h3>
                                        <div className="text-5xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 mb-2 animate-pulse">
                                            {formatCurrency(
                                                ((costData.attendees || 0) * ((costData.avgMonthlyCost || 0) / 22 / 8) * (participants.reduce((acc, p) => acc + (p.minutes || 0), 0) / 60)) + (costData.extraCosts || 0)
                                            )}
                                        </div>
                                        <div className="text-sm text-gray-500 mb-8">
                                            (Tasa de consumo: {formatCurrency(((costData.avgMonthlyCost || 0) / 22 / 8 / 60) * (costData.attendees || 0))}/min)
                                        </div>

                                        <div className="bg-white/5 rounded-2xl p-6 border border-white/10 text-left space-y-3 mb-8">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-400">Asistentes:</span>
                                                <span className="font-bold">{costData.attendees}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-400">Duración Total:</span>
                                                <span className="font-bold">{participants.reduce((acc, p) => acc + (p.minutes || 0), 0)} min</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-400">Costo Mensual Prom.:</span>
                                                <span className="font-bold">{formatCurrency(costData.avgMonthlyCost)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-400">Costos Extra:</span>
                                                <span className="font-bold text-yellow-400">+{formatCurrency(costData.extraCosts)}</span>
                                            </div>
                                        </div>

                                        {/* SHARE TOGGLE */}
                                        <div className="flex flex-col gap-4 mb-6">
                                            <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${costData.shareCost ? 'bg-green-500/10 border-green-500/50' : 'bg-white/5 border-white/10'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-6 rounded-full relative transition-colors ${costData.shareCost ? 'bg-green-500' : 'bg-gray-600'}`}>
                                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${costData.shareCost ? 'left-5' : 'left-1'}`} />
                                                    </div>
                                                    <div className="text-left">
                                                        <span className={`block font-bold text-sm ${costData.shareCost ? 'text-green-400' : 'text-gray-300'}`}>
                                                            {costData.shareCost ? 'Visible para todos' : 'Privado (Solo Admin)'}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {costData.shareCost ? 'Los oradores verán el costo de la reunión.' : 'Solo tú verás el costo.'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    className="hidden"
                                                    checked={costData.shareCost}
                                                    onChange={(e) => setCostData({ ...costData, shareCost: e.target.checked })}
                                                />
                                            </label>
                                        </div>

                                        <button
                                            onClick={() => setShowCostPopup(false)}
                                            className="w-full bg-[#667eea] hover:bg-[#5a6fd6] text-white font-bold py-4 rounded-xl shadow-lg transition transform hover:scale-105"
                                        >
                                            Guardar Configuración
                                        </button>
                                    </div>
                                )}

                            </div>

                            {/* NAVIGATION BUTTONS */}
                            {wizardStep > 0 && wizardStep < 5 && (
                                <div className="flex justify-between mt-8 pt-6 border-t border-white/5">
                                    <button
                                        onClick={() => setWizardStep(wizardStep - 1)}
                                        className="text-gray-400 hover:text-white font-medium px-4 py-2 hover:bg-white/5 rounded-lg transition"
                                    >
                                        Atrás
                                    </button>
                                    <button
                                        onClick={() => setWizardStep(wizardStep + 1)}
                                        className="bg-white text-black hover:bg-gray-200 px-6 py-2 rounded-lg font-bold transition shadow-lg"
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

        </div >
    )
}
