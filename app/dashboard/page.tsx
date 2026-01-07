import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { signOut } from '../auth/actions'
import { Plus, Users, BarChart, LogOut, Clock } from 'lucide-react'
import Link from 'next/link'
import DashboardMeetingList from '@/components/DashboardMeetingList'

export default async function DashboardPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/login')
    }

    // Data Fetching
    const { data: meetingsData } = await supabase
        .from('meetings')
        .select('*')
        .eq('host_id', user.id)
        .order('created_at', { ascending: false })

    const { data: speakersData } = await supabase
        .from('speakers')
        .select('*')
        .eq('user_id', user.id)
        .order('name')

    const meetings = meetingsData || []
    const speakers = speakersData || []

    // Calculate Savings (Simple Approximation)
    // We assume 15% time saved on 'finished' meetings compared to scheduled duration
    // In a real scenario, this would aggregate `meeting_speakers` vs `allocated`
    const savings = meetings
        .filter(m => m.status === 'finished')
        .reduce((acc, m) => {
            const avgCost = m.meta?.avgMonthlyCost || 0
            if (!avgCost) return acc

            // Hourly rate per person
            const hourlyRate = avgCost / 22 / 8
            const attendees = m.meta?.attendees || 1
            const costPerMinute = (hourlyRate * attendees) / 60

            // Estimated saving (20% of meeting time)
            // Ideally we'd compare allocated vs used, but for the dashboard demo:
            const duration = (m.speakers || []).reduce((s: any, p: any) => s + (p.minutes || 0), 0)
            const savedMinutes = duration * 0.15

            return acc + (savedMinutes * costPerMinute)
        }, 0)

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)


    return (
        <div className="min-h-screen bg-[#1a1a2e] text-white font-sans">

            {/* HEADER */}
            <header className="border-b border-white/10 px-8 py-4 flex justify-between items-center bg-[#1a1a2e]/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="bg-[#667eea]/20 p-2 rounded-xl">
                        <Clock className="w-5 h-5 text-[#667eea]" />
                    </div>
                    <span className="font-bold text-lg tracking-tight">TimeKeeper <span className="text-xs bg-[#667eea] px-2 py-0.5 rounded text-white ml-2">PRO</span></span>
                </div>
                <div className="flex items-center gap-6">
                    <span className="text-sm text-gray-400">Hola, {user.email}</span>
                    <form action={signOut}>
                        <button className="text-gray-400 hover:text-white transition flex items-center gap-2 text-sm active:scale-95">
                            <LogOut className="w-4 h-4" /> Salir
                        </button>
                    </form>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-10">

                {/* WELCOME & ACTIONS */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                    <div>
                        <h1 className="text-4xl font-bold mb-2">Panel de Control</h1>
                        <p className="text-gray-400">Gestiona tus reuniones y oradores desde un solo lugar.</p>
                    </div>
                    <Link href="/new" className="bg-[#667eea] hover:bg-[#5a6fd6] text-white px-6 py-3 rounded-xl font-bold transition flex items-center gap-2 shadow-lg shadow-[#667eea]/20 active:scale-95">
                        <Plus className="w-5 h-5" /> Nueva Reunión
                    </Link>
                </div>

                {/* METRICS OVERVIEW */}
                <div className="grid md:grid-cols-3 gap-6 mb-12">
                    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-400 font-medium">Reuniones Totales</h3>
                            <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400"><BarChart className="w-5 h-5" /></div>
                        </div>
                        <div className="text-3xl font-bold">{meetings.length}</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-400 font-medium">Oradores Guardados</h3>
                            <div className="bg-purple-500/20 p-2 rounded-lg text-purple-400"><Users className="w-5 h-5" /></div>
                        </div>
                        <div className="text-3xl font-bold">{speakers.length}</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-400 font-medium">Dinero Ahorrado (Est.)</h3>
                            <div className="bg-green-500/20 p-2 rounded-lg text-green-400"><span className="font-bold">$</span></div>
                        </div>
                        <div className="text-3xl font-bold text-green-400">{formatCurrency(savings)}</div>
                    </div>
                </div>

                {/* EMPTY STATES */}
                <div className="grid md:grid-cols-2 gap-8">

                    {/* MEETINGS LIST */}
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 min-h-[300px] flex flex-col">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            Historial de Reuniones
                        </h3>

                        <DashboardMeetingList meetings={meetings} />
                    </div>

                    {/* SPEAKERS LIST */}
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 min-h-[300px] flex flex-col">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                            Mis Oradores
                        </h3>

                        {speakers.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                                <Users className="w-12 h-12 mb-4 text-gray-600" />
                                <p>Agrega oradores frecuentes para agilizar tus reuniones.</p>
                                <button className="mt-4 text-[#667eea] font-bold text-sm hover:underline">Agregar Orador</button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {speakers.slice(0, 5).map((s: any) => (
                                    <div key={s.id} className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center font-bold">
                                            {s.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-bold">{s.name}</div>
                                            <div className="text-xs text-gray-500">{s.email}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

            </main>
        </div>
    )
}
