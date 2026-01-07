'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Loader2, DollarSign, Clock, Users, TrendingUp } from 'lucide-react'

// Colors for charts
const COLORS = ['#667eea', '#764ba2', '#00b894', '#fdcb6e', '#e17055', '#d63031', '#0984e3']
const RADIAN = Math.PI / 180

interface MeetingAnalyticsProps {
    meetingId: string | null
    isOpen: boolean
    onClose: () => void
}

export default function MeetingAnalytics({ meetingId, isOpen, onClose }: MeetingAnalyticsProps) {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any>(null)
    const [meeting, setMeeting] = useState<any>(null)

    useEffect(() => {
        if (isOpen && meetingId) {
            fetchData()
        }
    }, [isOpen, meetingId])

    const fetchData = async () => {
        setLoading(true)
        try {
            // 1. Fetch Meeting Details (for Plan)
            const { data: meetingData, error: mError } = await supabase
                .from('meetings')
                .select('*')
                .eq('id', meetingId)
                .single()

            if (mError) throw mError
            setMeeting(meetingData)

            // 2. Fetch Actual Logs
            const { data: logsData, error: lError } = await supabase
                .from('meeting_speakers')
                .select('*')
                .eq('meeting_id', meetingId)

            if (lError) throw lError

            processData(meetingData, logsData || [])

        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const processData = (meeting: any, logs: any[]) => {
        // Merge Plan (meeting.speakers) with Actual (logs)
        const speakers = meeting.speakers || [] // Array of { name, minutes, speaker_id? }

        const combined = speakers.map((s: any) => {
            // Find log(s) for this speaker
            // Matches by speaker_id if available, or name as fallback
            const log = logs.find((l: any) =>
                (s.speaker_id && l.speaker_id === s.speaker_id) ||
                l.name_snapshot === s.name
            )

            const allocatedTitle = s.minutes * 60 // seconds
            const spoken = log ? Number(log.spoken_seconds) : 0
            const cost = log ? Number(log.cost_incurred) : 0

            return {
                name: s.name,
                Planificado: Math.round(allocatedTitle / 60), // minutes
                Real: Math.round(spoken / 60), // minutes
                cost: cost,
                rawSpoken: spoken
            }
        })

        // Add "Others" from logs that weren't in the plan?
        // (Skipping for simplicity in this version)

        setData(combined)
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val)
    }

    const getTotalCost = () => {
        if (!data) return 0
        return data.reduce((acc: number, curr: any) => acc + (curr.cost || 0), 0)
    }

    const getTotalDuration = () => {
        if (!data) return 0
        return data.reduce((acc: number, curr: any) => acc + (curr.rawSpoken || 0), 0)
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[85vw] md:max-w-7xl bg-[#1a1a2e] border-white/10 text-white max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <TrendingUp className="text-[#667eea]" />
                        Análisis de Reunión
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        {meeting?.title} • {new Date(meeting?.created_at).toLocaleDateString()}
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="h-64 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-[#667eea]" />
                    </div>
                ) : (
                    <div className="space-y-8 mt-4">

                        {/* KPI CARDS */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                <div className="text-gray-400 text-sm mb-1 flex items-center gap-2"><DollarSign size={14} /> Costo Real</div>
                                <div className="text-2xl font-bold text-green-400">
                                    {formatCurrency(getTotalCost())}
                                </div>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                <div className="text-gray-400 text-sm mb-1 flex items-center gap-2"><Clock size={14} /> Duración Total</div>
                                <div className="text-2xl font-bold">
                                    {Math.round(getTotalDuration() / 60)} min
                                </div>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                <div className="text-gray-400 text-sm mb-1 flex items-center gap-2"><Users size={14} /> Participantes</div>
                                <div className="text-2xl font-bold">
                                    {data?.length || 0}
                                </div>
                            </div>
                        </div>

                        {/* CHARTS ROW - Wider Layout */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                            {/* TIME COMPARISON - Horizontal Bars */}
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/5 min-h-[400px]">
                                <h3 className="text-lg font-bold mb-6">Tiempo: Planificado vs Real (min)</h3>
                                <div className="h-[300px] w-full text-sm">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data} layout="horizontal" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                            <XAxis dataKey="name" stroke="#999" tick={{ fill: '#ccc' }} />
                                            <YAxis type="number" stroke="#999" tick={{ fill: '#ccc' }} />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                            <Bar dataKey="Planificado" fill="#667eea" radius={[4, 4, 0, 0]} barSize={30} />
                                            <Bar dataKey="Real" fill="#00b894" radius={[4, 4, 0, 0]} barSize={30} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* COST DISTRIBUTION */}
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/5 min-h-[400px]">
                                <h3 className="text-lg font-bold mb-6">Distribución de Costos</h3>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={data}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={5}
                                                dataKey="cost"
                                                nameKey="name"
                                                label={({ name, percent }: { name?: string, percent?: number }) => (percent || 0) > 0.05 ? `${((percent || 0) * 100).toFixed(0)}%` : ''}
                                            >
                                                {data?.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value: any) => formatCurrency(Number(value || 0))}
                                                contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
