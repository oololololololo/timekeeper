import { createClient } from '@/utils/supabase/server'
import { addSpeaker, deleteSpeaker } from './actions'
import { Plus, Trash2, User, Mail, DollarSign, Users } from 'lucide-react'
import Link from 'next/link'

export default async function SpeakersPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Fetch speakers with their meeting logs
    const { data: speakers } = await supabase
        .from('speakers')
        .select(`
            *,
            meeting_speakers (
                spoken_seconds,
                allocated_seconds
            )
        `)
        .eq('user_id', user?.id)
        .order('name')

    // Helper to format duration
    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        if (h > 0) return `${h}h ${m}m`
        return `${m}m`
    }

    const handleDeleteSpeaker = async (formData: FormData) => {
        'use server'
        await deleteSpeaker(formData)
        return
    }

    const handleAddSpeaker = async (formData: FormData) => {
        'use server'
        await addSpeaker(formData)
        return
    }

    return (
        <div className="p-8 max-w-6xl mx-auto text-white">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
                        Oradores Frecuentes
                    </h1>
                    <p className="text-gray-400 mt-1">Gestiona tu equipo y analiza su desempeño.</p>
                </div>
                <Users className="w-10 h-10 text-[#667eea] opacity-50" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LIST / METRICS */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <h2 className="text-xl font-semibold mb-4">Directorio</h2>

                        {!speakers?.length ? (
                            <div className="text-center py-10 text-gray-500">
                                <p>No hay oradores guardados.</p>
                                <p className="text-sm mt-2">Agrega uno a la derecha para empezar.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {speakers.map((speaker: any) => {
                                    // Calculate metrics
                                    const logs = speaker.meeting_speakers || []
                                    const totalMeetings = logs.length
                                    const totalSeconds = logs.reduce((acc: number, log: any) => acc + (log.spoken_seconds || 0), 0)
                                    const totalAllocated = logs.reduce((acc: number, log: any) => acc + (log.allocated_seconds || 0), 0)

                                    // Compliance: (Spoken / Allocated) * 100. Ideal is 100%. >100 means overtime.
                                    const compliance = totalAllocated > 0 ? (totalSeconds / totalAllocated) * 100 : 0

                                    return (
                                        <div key={speaker.id} className="group bg-black/20 hover:bg-white/5 border border-white/5 hover:border-white/10 rounded-xl p-4 transition flex flex-col sm:flex-row items-center justify-between gap-4">
                                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center font-bold text-lg">
                                                    {speaker.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-lg">{speaker.name}</div>
                                                    <div className="text-gray-400 text-sm flex items-center gap-2">
                                                        {speaker.email && <span>{speaker.email}</span>}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* METRICS PILLS */}
                                            <div className="flex gap-3 text-xs">
                                                <div className="bg-black/40 px-3 py-1.5 rounded-lg text-gray-300 text-center min-w-[80px]">
                                                    <div className="font-bold text-white text-sm">{totalMeetings}</div>
                                                    <div>Reuniones</div>
                                                </div>
                                                <div className="bg-black/40 px-3 py-1.5 rounded-lg text-gray-300 text-center min-w-[80px]">
                                                    <div className="font-bold text-white text-sm">{formatDuration(totalSeconds)}</div>
                                                    <div>Hablado</div>
                                                </div>
                                                <div className="bg-black/40 px-3 py-1.5 rounded-lg text-gray-300 text-center min-w-[80px]">
                                                    <div className={`font-bold text-sm ${compliance > 110 ? 'text-red-400' : compliance < 90 ? 'text-yellow-400' : 'text-green-400'}`}>
                                                        {compliance > 0 ? Math.round(compliance) + '%' : '-'}
                                                    </div>
                                                    <div>Uso Tiempo</div>
                                                </div>
                                            </div>

                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                                <form action={handleDeleteSpeaker} className="inline">
                                                    <input type="hidden" name="id" value={speaker.id} />
                                                    <button className="p-2 hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded-lg transition">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </form>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ADD FORM */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-fit sticky top-6">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <Plus className="w-5 h-5" /> Nuevo Orador
                    </h2>

                    <form action={handleAddSpeaker} className="space-y-4">
                        <div>
                            <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Nombre</label>
                            <input
                                name="name"
                                type="text"
                                placeholder="Ej. Juan Pérez"
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-[#667eea] outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Email (Opcional)</label>
                            <input
                                name="email"
                                type="email"
                                placeholder="juan@empresa.com"
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-[#667eea] outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Costo Hora (Opcional)</label>
                            <input
                                name="cost"
                                type="number"
                                placeholder="$"
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-[#667eea] outline-none"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-[#667eea] hover:bg-[#5a6fd6] text-white font-bold py-3 rounded-xl transition shadow-lg shadow-[#667eea]/20 mt-4"
                        >
                            Guardar Orador
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
