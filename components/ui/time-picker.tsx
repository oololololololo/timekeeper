'use client'

import * as React from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimePickerProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
}

export function TimePicker({
    value,
    onChange,
    placeholder = 'Select time',
    className,
}: TimePickerProps) {
    const [isOpen, setIsOpen] = React.useState(false)
    const containerRef = React.useRef<HTMLDivElement>(null)

    // Generate options
    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
    const minutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']

    const [selectedHour, setSelectedHour] = React.useState(value ? value.split(':')[0] : '12')
    const [selectedMinute, setSelectedMinute] = React.useState(value ? value.split(':')[1] : '00')

    React.useEffect(() => {
        if (value) {
            const [h, m] = value.split(':')
            setSelectedHour(h)
            setSelectedMinute(m)
        }
    }, [value])

    const handleTimeChange = (h: string, m: string) => {
        setSelectedHour(h)
        setSelectedMinute(m)
        onChange(`${h}:${m}`)
        // Don't close immediately to allow fine tuning
    }

    // Close when clicking outside
    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className={cn('relative', className)} ref={containerRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'w-full bg-black/20 border border-white/10 rounded-xl p-4 pl-12 text-white/90 cursor-pointer flex items-center transition hover:bg-white/5 hover:border-[#667eea]',
                    !value && 'text-gray-500'
                )}
            >
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                {value ? (
                    <span className="font-mono text-lg tracking-wider">{value}</span>
                ) : (
                    <span>{placeholder}</span>
                )}
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl p-4 w-64 animate-in fade-in zoom-in-95 duration-200 flex gap-2">
                    <style jsx>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>

                    {/* Hours */}
                    <div className="flex-1 h-48 overflow-y-auto scrollbar-hide text-center border-r border-white/5">
                        <div className="text-[10px] text-gray-500 mb-2 font-bold uppercase tracking-wider sticky top-0 bg-[#1a1a2e] py-1 z-10">Hora</div>
                        <div className="space-y-1 px-1 pb-2">
                            {hours.map(h => (
                                <button
                                    key={h}
                                    type="button"
                                    onClick={() => handleTimeChange(h, selectedMinute)}
                                    className={cn(
                                        "w-full py-2 rounded-lg text-sm transition-all duration-200",
                                        selectedHour === h
                                            ? "bg-[#667eea] text-white font-bold shadow-lg shadow-blue-500/20 scale-105"
                                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                                    )}
                                >
                                    {h}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Separator */}
                    <div className="flex flex-col justify-center h-48 pt-6">
                        <span className="text-gray-600 font-bold text-xl animate-pulse">:</span>
                    </div>

                    {/* Minutes */}
                    <div className="flex-1 h-48 overflow-y-auto scrollbar-hide text-center border-l border-white/5">
                        <div className="text-[10px] text-gray-500 mb-2 font-bold uppercase tracking-wider sticky top-0 bg-[#1a1a2e] py-1 z-10">Min</div>
                        <div className="space-y-1 px-1 pb-2">
                            {minutes.map(m => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => handleTimeChange(selectedHour, m)}
                                    className={cn(
                                        "w-full py-2 rounded-lg text-sm transition-all duration-200",
                                        selectedMinute === m
                                            ? "bg-[#667eea] text-white font-bold shadow-lg shadow-blue-500/20 scale-105"
                                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                                    )}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>

                </div>
            )}
        </div>
    )
}
