import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { signOut } from '../auth/actions'
import { Plus, Users, BarChart, LogOut } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/login')
    }

    // Placeholder data for now
    const meetings = []
    const speakers = []

    return (
        <div className="min-h-screen bg-[#1a1a2e] text-white font-sans">

            {/* HEADER */}
            <header className="border-b border-white/10 px-8 py-4 flex justify-between items-center bg-[#1a1a2e]/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">⏱️</span>
                    <span className="font-bold text-lg tracking-tight">TimeKeeper <span className="text-xs bg-[#667eea] px-2 py-0.5 rounded text-white ml-2">PRO</span></span>
                </div>
                <div className="flex items-center gap-6">
                    <span className="text-sm text-gray-400">Hola, {user.email}</span>
                    <form action={signOut}>
                        <button className="text-gray-400 hover:text-white transition flex items-center gap-2 text-sm">
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
                    <Link href="/new" className="bg-[#667eea] hover:bg-[#5a6fd6] text-white px-6 py-3 rounded-xl font-bold transition flex items-center gap-2 shadow-lg shadow-[#667eea]/20">
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
                        <div className="text-3xl font-bold">$0</div>
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

                        {meetings.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                                <BarChart className="w-12 h-12 mb-4 text-gray-600" />
                                <p>Aún no has guardado reuniones.</p>
                            </div>
                        ) : (
                            <div>{/* List would go here */}</div>
                        )}
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
                            <div>{/* List would go here */}</div>
                        )}
                    </div>

                </div>

            </main>
        </div>
    )
}
