'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BarChart, PieChart, Activity } from 'lucide-react'
import MeetingAnalytics from './MeetingAnalytics'

export default function DashboardMeetingList({ meetings }: { meetings: any[] }) {
    const [analyzingId, setAnalyzingId] = useState<string | null>(null)

    if (meetings.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                <BarChart className="w-12 h-12 mb-4 text-gray-600" />
                <p>Aún no has guardado reuniones.</p>
            </div>
        )
    }

    return (
        <>
            <div className="space-y-4">
                {meetings.slice(0, 5).map((m: any) => (
                    <div key={m.id} className="block bg-white/5 p-4 rounded-xl border border-white/5 transition hover:bg-white/10 group relative">
                        <div className="flex justify-between items-start mb-1 pr-12">
                            <Link href={`/${m.id}/admin`} className="hover:underline">
                                <h4 className="font-bold group-hover:text-[#667eea] transition">{m.title}</h4>
                            </Link>
                            <span className={`text-xs px-2 py-0.5 rounded ${m.status === 'finished' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                {m.status === 'finished' ? 'Finalizada' : 'Pendiente'}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-400">
                            <span>{new Date(m.created_at).toLocaleDateString()}</span>
                            <span>{m.meta?.attendees || 0} personas</span>
                        </div>

                        {/* ANALYTICS BUTTON */}
                        {m.status === 'finished' && (
                            <button
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setAnalyzingId(m.id)
                                }}
                                className="absolute top-4 right-4 p-2 bg-white/10 rounded-lg hover:bg-[#667eea] hover:text-white transition text-gray-400"
                                title="Ver Métricas"
                            >
                                <Activity size={18} />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            <MeetingAnalytics
                meetingId={analyzingId}
                isOpen={!!analyzingId}
                onClose={() => setAnalyzingId(null)}
            />
        </>
    )
}
