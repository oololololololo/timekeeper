'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar as CalendarIcon } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'

import { cn } from '@/lib/utils'

interface DatePickerProps extends React.HTMLAttributes<HTMLDivElement> {
    date: Date | undefined
    setDate: (date: Date | undefined) => void
    placeholder?: string
    showTime?: boolean
}

export function DatePicker({
    date,
    setDate,
    placeholder = 'Seleccionar fecha',
    className,
    showTime = true,
}: DatePickerProps) {
    const [isOpen, setIsOpen] = React.useState(false)
    const containerRef = React.useRef<HTMLDivElement>(null)

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

    const handleSelect = (selectedDate: Date | undefined) => {
        setDate(selectedDate)
        if (!showTime) {
            // Keep the time if we are not showing time picker?
            // Or if not showing time, usually implies Date Only.
            // But let's just close.
            setIsOpen(false)
        }
    }

    return (
        <div className={cn('relative', className)} ref={containerRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'w-full bg-black/20 border border-white/10 rounded-xl p-4 pl-12 text-white/90 cursor-pointer flex items-center transition hover:bg-white/5 hover:border-[#667eea]',
                    !date && 'text-gray-500'
                )}
            >
                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                {date ? (
                    format(date, showTime ? "PPP 'a las' HH:mm" : "PPP", { locale: es })
                ) : (
                    <span>{placeholder}</span>
                )}
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-200">
                    <style>{`
            .rdp { --rdp-cell-size: 40px; --rdp-accent-color: #667eea; --rdp-background-color: #2e2e48; margin: 0; }
            .rdp-day_selected:not([disabled]) { background-color: #667eea; color: white; font-weight: bold; }
            .rdp-day_selected:hover:not([disabled]) { background-color: #5a6fd6; }
            .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: rgba(255,255,255,0.1); }
            .rdp-caption_label { color: #fff; font-weight: bold; }
            .rdp-head_cell { color: #9ca3af; font-weight: normal; font-size: 0.875rem; }
            .rdp-day { color: #e5e7eb; }
            .rdp-day_outside { color: #4b5563; }
            .rdp-nav_button { color: #e5e7eb; }
            .rdp-nav_button:hover { background-color: rgba(255,255,255,0.1); }
          `}</style>

                    <DayPicker
                        mode="single"
                        selected={date}
                        onSelect={handleSelect}
                        locale={es}
                        showOutsideDays
                    />

                    {/* Time Selector inside the DatePicker for single integrated flow if needed,
              but user asked for separate time picker logic.
              We'll just stick to Date here and handle Time separately as requested.
          */}
                    {showTime && (
                        <div className="pt-4 border-t border-white/10 mt-2 flex justify-between items-center px-2">
                            <span className="text-xs text-gray-400">Hora:</span>
                            <input
                                type="time"
                                className="bg-black/30 text-white p-2 rounded-lg text-sm outline-none focus:border-[#667eea] border border-transparent"
                                value={date ? format(date, 'HH:mm') : ''}
                                onChange={(e) => {
                                    const [h, m] = e.target.value.split(':')
                                    const newDate = date ? new Date(date) : new Date()
                                    newDate.setHours(Number(h), Number(m))
                                    setDate(newDate)
                                }}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
