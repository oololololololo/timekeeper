'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { X, Mic, MicOff, Settings, Play, Pause, ChevronLeft, ChevronRight, Edit3, Type, Moon, Sun, RotateCw } from 'lucide-react'
import { clsx } from 'clsx'
import { prepareScript, findBestMatch, TeleprompterWord } from '@/utils/teleprompter'

// Type for SpeechRecognition (since it's not standard in TS lib yet)
interface IWindow extends Window {
    webkitSpeechRecognition: any
    SpeechRecognition: any
}

interface TeleprompterProps {
    isOpen: boolean
    onClose: () => void
    meetingTimeFormatted: string // "MM:SS" passed from parent
    timerColor?: string
    isTimerAnimated?: boolean
}

export default function Teleprompter({
    isOpen,
    onClose,
    meetingTimeFormatted,
    timerColor = "#ffffff", // Default white if not passed
    isTimerAnimated = false
}: TeleprompterProps) {
    // State
    const [text, setText] = useState<string>('')
    const [words, setWords] = useState<TeleprompterWord[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isRecording, setIsRecording] = useState(false)
    const [isEditMode, setIsEditMode] = useState(true) // Start in edit mode if no text
    const [fontSize, setFontSize] = useState(48)
    const [isDarkTheme, setIsDarkTheme] = useState(true)
    const [visualStyle, setVisualStyle] = useState<'classic' | 'glass'>('glass')
    const [highlightColor, setHighlightColor] = useState<string>('#a855f7') // Default purple
    const [showSettings, setShowSettings] = useState(false)
    const [startListeningStatus, setStartListeningStatus] = useState<string>('Pausado')

    // Refs
    const recognitionRef = useRef<any>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const activeWordRef = useRef<HTMLSpanElement>(null)
    const currentIndexRef = useRef(currentIndex)
    const lastMatchTimeRef = useRef<number>(0)

    const COLOR_PRESETS = [
        { name: 'Purple', value: '#a855f7' },
        { name: 'Blue', value: '#3b82f6' },
        { name: 'Green', value: '#22c55e' },
        { name: 'Yellow', value: '#eab308' },
        { name: 'Pink', value: '#ec4899' },
        { name: 'Red', value: '#ef4444' },
    ]

    // Sync Ref
    useEffect(() => {
        currentIndexRef.current = currentIndex
    }, [currentIndex])

    // INITIALIZATION
    useEffect(() => {
        // Load settings from local storage
        const savedText = localStorage.getItem('teleprompter_text')
        const savedSize = localStorage.getItem('teleprompter_size')
        const savedStyle = localStorage.getItem('teleprompter_style')
        const savedColor = localStorage.getItem('teleprompter_color')

        if (savedText) {
            setText(savedText)
            setIsEditMode(false)
            setWords(prepareScript(savedText))
        }
        if (savedSize) setFontSize(Number(savedSize))
        if (savedStyle) setVisualStyle(savedStyle as 'classic' | 'glass')
        if (savedColor) setHighlightColor(savedColor)
    }, [])

    useEffect(() => {
        if (!isOpen) {
            stopListening()
            return
        }
    }, [isOpen])

    // SPEECH RECOGNITION SETUP
    const initSpeech = useCallback(() => {
        const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow
        const Api = SpeechRecognition || webkitSpeechRecognition

        if (!Api) {
            setStartListeningStatus('Navegador no soportado (Chrome ok)')
            return null
        }

        const recognition = new Api()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'es-CL' // Default to ES-CL, could be prop

        recognition.onstart = () => {
            setStartListeningStatus('Escuchando...')
        }

        recognition.onresult = (event: any) => {
            let transcript = ''
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                transcript += event.results[i][0].transcript
            }

            // Logic to match words using REF to avoid stale closure
            const spoken = transcript.trim().split(/\s+/)
            const currentIdx = currentIndexRef.current
            const match = findBestMatch(spoken, words, currentIdx)

            if (match && match.index >= currentIdx) {
                // Debounce jumping too fast
                // For MVP: Direct jump
                advanceToWord(match.index)
            }
        }

        recognition.onend = () => {
            if (isRecording) {
                // Auto restart if it stops unexpectedly but we want it running
                try { recognition.start() } catch { }
            } else {
                setStartListeningStatus('Pausado')
            }
        }

        return recognition
    }, [words, isRecording]) // Removed currentIndex from dep array as we use ref

    // LOGIC CONTROLS
    const startListening = () => {
        if (!words.length) return
        setIsRecording(true)
        if (!recognitionRef.current) {
            recognitionRef.current = initSpeech()
        }
        try { recognitionRef.current?.start() } catch (e) { console.error(e) }
    }

    const stopListening = () => {
        setIsRecording(false)
        try { recognitionRef.current?.stop() } catch { }
        setStartListeningStatus('Pausado')
    }

    const toggleRecording = () => {
        if (isRecording) stopListening()
        else startListening()
    }

    const advanceToWord = (index: number) => {
        const target = Math.min(index, words.length - 1)
        setCurrentIndex(target) // +1 to be next word? No, current is fine.

        // Scroll
        // We rely on useEffect scrolling when currentIndex changes to ensure ref is updated
    }

    // SCROLLING EFFECT
    useEffect(() => {
        if (activeWordRef.current && containerRef.current) {
            const container = containerRef.current
            const element = activeWordRef.current

            // Calculate center position
            const containerHeight = container.clientHeight
            const elementTop = element.offsetTop
            const offset = elementTop - (containerHeight * 0.4) // 40% down

            container.scrollTo({
                top: offset,
                behavior: 'smooth'
            })
        }
    }, [currentIndex])

    // EDITOR LOGIC
    const handleSaveText = () => {
        if (!text.trim()) return
        localStorage.setItem('teleprompter_text', text)
        setWords(prepareScript(text))
        setIsEditMode(false)
        setCurrentIndex(0)
    }

    const handleBack = () => advanceToWord(Math.max(0, currentIndex - 1))
    const handleForward = () => advanceToWord(Math.min(words.length - 1, currentIndex + 1))

    const handleStyleChange = (style: 'classic' | 'glass') => {
        setVisualStyle(style)
        localStorage.setItem('teleprompter_style', style)
    }

    const handleColorChange = (color: string) => {
        setHighlightColor(color)
        localStorage.setItem('teleprompter_color', color)
    }

    // Helper classes based on theme
    const isGlass = visualStyle === 'glass'
    const bgClass = isGlass
        ? "bg-gradient-to-br from-slate-950 via-[#1a0b2e] to-slate-950"
        : (isDarkTheme ? "bg-black" : "bg-white")

    const textClass = isGlass
        ? "text-white font-sans tracking-wide"
        : (isDarkTheme ? "text-white" : "text-black")

    return (
        <div className={clsx("fixed inset-0 z-[100] flex flex-col transition-colors duration-500", bgClass, textClass)}>

            {/* TIMER OVERLAY (Pointer events none to allow clicking through if needed, though it's at top) */}
            <div className="absolute top-0 left-0 right-0 h-24 flex items-center justify-center z-20 pointer-events-none">
                <div
                    className={clsx(
                        "font-mono text-5xl font-bold px-6 py-2 rounded-2xl transition-all duration-500",
                        isGlass ? "bg-black/20 backdrop-blur-md shadow-2xl border border-white/5" : "bg-black/80",
                        isTimerAnimated && "animate-pulse"
                    )}
                    style={{ color: timerColor, textShadow: `0 0 20px ${timerColor}44` }}
                >
                    {meetingTimeFormatted}
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 relative overflow-hidden flex flex-col">
                {isEditMode ? (
                    <div className="flex-1 flex flex-col p-8 md:p-12 items-center justify-center">
                        <h2 className="text-2xl font-bold mb-4 opacity-50">Ingresa tu guion</h2>
                        <textarea
                            className={clsx(
                                "w-full max-w-3xl flex-1 border-2 rounded-xl p-6 text-xl resize-none focus:outline-none mb-6 transition-all",
                                isGlass
                                    ? "bg-white/5 border-white/10 focus:border-purple-500 text-white placeholder-white/30 backdrop-blur-sm"
                                    : (isDarkTheme ? "bg-transparent border-gray-800 focus:border-green-500" : "bg-transparent border-gray-200 focus:border-green-500")
                            )}
                            placeholder="Pega tu texto aquí..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                        />
                        <button
                            onClick={handleSaveText}
                            className={clsx("font-bold py-3 px-8 rounded-full text-lg transition transform hover:scale-105 shadow-lg", isGlass ? "bg-purple-600 hover:bg-purple-500 text-white" : "bg-green-500 hover:bg-green-600 text-black")}
                        >
                            Comenzar Lectura
                        </button>
                    </div>
                ) : (
                    <>
                        {/* PROGRESS BAR */}
                        <div className={clsx("h-1 w-full", isGlass ? "bg-white/5" : "bg-gray-800")}>
                            <div
                                className={clsx("h-full transition-all duration-300", "shadow-[0_0_10px_rgba(255,255,255,0.3)]")}
                                style={{
                                    width: `${(currentIndex / Math.max(words.length, 1)) * 100}%`,
                                    backgroundColor: highlightColor
                                }}
                            />
                        </div>

                        {/* TEXT DISPLAY */}
                        <div
                            ref={containerRef}
                            className="flex-1 overflow-y-auto px-4 md:px-[20%] pt-[40vh] pb-[50vh] no-scrollbar"
                        >
                            <div style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }} className="transition-all font-medium text-center md:text-left">
                                {words.map((word, i) => {
                                    const isCurrent = i === currentIndex
                                    const isPast = i < currentIndex

                                    // DYNAMIC STYLE FOR ACTIVE WORD
                                    const activeStyle = isCurrent ? {
                                        color: isGlass ? 'white' : highlightColor, // Glass keeps white text (with glow)
                                        backgroundColor: 'transparent',
                                        textShadow: isGlass
                                            // White core + Strong Color Glow + Wide Ambient Glow
                                            ? `0 0 5px #fff, 0 0 10px #fff, 0 0 20px ${highlightColor}, 0 0 35px ${highlightColor}, 0 0 50px ${highlightColor}`
                                            : 'none',
                                        // Removed borders and box shadows as requested
                                    } : {}

                                    return (
                                        <span
                                            key={i}
                                            ref={isCurrent ? activeWordRef : null}
                                            onClick={() => setCurrentIndex(i)}
                                            className={clsx(
                                                "inline-block mr-[0.25em] px-1 -mx-1 rounded transition-all duration-200 cursor-pointer hover:opacity-100",

                                                isCurrent && "font-medium",

                                                // CLASSIC THEME BASE (Override inline if needed)
                                                !isGlass && isCurrent && !isDarkTheme && "font-bold",

                                                // Opacity
                                                isPast && "opacity-30 blur-[0.5px]",
                                                !isPast && !isCurrent && "opacity-50"
                                            )}
                                            style={isCurrent ? activeStyle : {}}
                                        >
                                            {word.original}
                                        </span>
                                    )
                                })}
                            </div>
                        </div>

                        {/* LISTENING INDICATOR */}
                        <div className="absolute top-24 left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none opacity-50">
                            <div
                                className={clsx("w-2 h-2 rounded-full transition-colors animate-pulse", !isRecording && "bg-gray-500")}
                                style={{ backgroundColor: isRecording ? highlightColor : undefined, boxShadow: isRecording ? `0 0 10px ${highlightColor}` : 'none' }}
                            />
                            <span className="text-xs uppercase tracking-widest font-mono">{startListeningStatus}</span>
                        </div>
                    </>
                )}
            </div>

            {/* CONTROLS FOOTER */}
            {!isEditMode && (
                <div className={clsx(
                    "h-24 flex items-center justify-between px-12 z-30 transition-all border-t backdrop-blur-xl",
                    isGlass
                        ? "bg-[#0f0518]/80 border-white/10" // Dark glass full bar
                        : (isDarkTheme ? "bg-black/90 border-white/10" : "bg-white/90 border-black/5")
                )}>
                    {/* LEFT: SETTINGS TOGGLE */}
                    <div className="relative">
                        <button onClick={() => setShowSettings(!showSettings)} className="p-3 rounded-full hover:bg-gray-500/20 transition">
                            <Settings size={24} className={isGlass ? "text-white/80" : ""} />
                        </button>

                        {/* POPUP SETTINGS */}
                        {showSettings && (
                            <div className={clsx(
                                "absolute bottom-24 left-0 p-5 rounded-2xl border flex flex-col gap-5 shadow-2xl w-72 animate-in slide-in-from-bottom-5 fade-in duration-200",
                                isGlass
                                    ? "bg-[#1e1433]/95 backdrop-blur-xl border-white/10 text-white"
                                    : (isDarkTheme ? "bg-black border-white/20" : "bg-white border-gray-200")
                            )}>
                                <h4 className="font-bold opacity-50 uppercase text-xs tracking-wider mb-1">Visual</h4>

                                {/* VISUAL STYLE SWITCHER */}
                                <div className="flex bg-white/10 p-1 rounded-lg">
                                    <button
                                        onClick={() => handleStyleChange('classic')}
                                        className={clsx("flex-1 py-2 text-xs font-bold rounded-md transition", visualStyle === 'classic' ? (isDarkTheme ? "bg-white text-black" : "bg-black text-white") : "hover:bg-white/5 opacity-50")}
                                    >
                                        Incial
                                    </button>
                                    <button
                                        onClick={() => handleStyleChange('glass')}
                                        className={clsx("flex-1 py-2 text-xs font-bold rounded-md transition", visualStyle === 'glass' ? "bg-purple-600 text-white shadow-lg" : "hover:bg-white/5 opacity-50")}
                                    >
                                        Modern Glass
                                    </button>
                                </div>

                                <div className="h-px bg-white/10 my-1" />

                                {/* COLOR PICKER */}
                                <div>
                                    <div className="text-xs uppercase opacity-50 mb-2 font-bold">Color de Resaltado</div>
                                    <div className="flex gap-2 flex-wrap">
                                        {COLOR_PRESETS.map((color) => (
                                            <button
                                                key={color.value}
                                                onClick={() => handleColorChange(color.value)}
                                                className={clsx(
                                                    "w-8 h-8 rounded-full border-2 transition hover:scale-110",
                                                    highlightColor === color.value ? "border-white scale-110 shadow-lg" : "border-transparent opacity-50 hover:opacity-100"
                                                )}
                                                style={{ backgroundColor: color.value, boxShadow: highlightColor === color.value ? `0 0 10px ${color.value}` : 'none' }}
                                                title={color.name}
                                            />
                                        ))}
                                        <div className="w-8 h-8 relative rounded-full overflow-hidden hover:scale-110 transition opacity-50 hover:opacity-100 cursor-pointer border-2 border-white/20">
                                            <input
                                                type="color"
                                                value={highlightColor}
                                                onChange={(e) => handleColorChange(e.target.value)}
                                                className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] cursor-pointer p-0 border-0"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-white/10 my-1" />

                                {/* FONT SIZE */}
                                <div>
                                    <div className="text-xs uppercase opacity-50 mb-2 font-bold flex justify-between">
                                        <span>Tamaño</span>
                                        <span>{fontSize}px</span>
                                    </div>
                                    <input
                                        type="range" min="20" max="100"
                                        value={fontSize}
                                        onChange={(e) => {
                                            setFontSize(Number(e.target.value))
                                            localStorage.setItem('teleprompter_size', e.target.value)
                                        }}
                                        className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                    />
                                </div>

                                {/* THEME (Only for Classic) */}
                                {visualStyle === 'classic' && (
                                    <button onClick={() => setIsDarkTheme(!isDarkTheme)} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-bold transition">
                                        {isDarkTheme ? <Sun size={16} /> : <Moon size={16} />}
                                        {isDarkTheme ? "Modo Claro" : "Modo Oscuro"}
                                    </button>
                                )}

                                <button onClick={() => setIsEditMode(true)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 text-sm font-bold text-green-400 transition bg-green-400/10">
                                    <Edit3 size={16} /> Editar Texto
                                </button>
                            </div>
                        )}
                    </div>

                    {/* CENTER: PLAYBACK */}
                    <div className="flex items-center gap-8">
                        <button onClick={handleBack} className="p-2 hover:scale-110 opacity-50 hover:opacity-100 transition"><ChevronLeft size={32} /></button>

                        <button
                            onClick={toggleRecording}
                            className={clsx(
                                "w-16 h-16 rounded-full flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 shadow-xl",
                                isRecording
                                    ? "text-white animate-pulse"
                                    : (isGlass ? "bg-white/10 border border-white/20 text-white hover:bg-white/20" : "bg-green-500 text-black")
                            )}
                            style={{
                                backgroundColor: isRecording ? '#ef4444' : undefined,
                                boxShadow: isRecording && isGlass ? `0 0 20px ${highlightColor}` : undefined
                            }}
                        >
                            {isRecording ? <Pause size={32} fill="currentColor" /> : <Mic size={32} />}
                        </button>

                        <button onClick={handleForward} className="p-2 hover:scale-110 opacity-50 hover:opacity-100 transition"><ChevronRight size={32} /></button>
                    </div>

                    {/* RIGHT: RESET */}
                    <div>
                        <button onClick={() => setCurrentIndex(0)} className="p-3 rounded-full hover:bg-gray-500/20 transition opacity-50 hover:opacity-100" title="Reiniciar">
                            <RotateCw size={24} className={isGlass ? "text-white/80" : ""} />
                        </button>
                    </div>
                </div>
            )}

            {/* CLOSE BUTTON (Fixed + Max Z-Index + Explicit Pointer Events) */}
            <button
                onClick={onClose}
                className={clsx(
                    "fixed top-6 right-6 z-[99999] p-3 rounded-full transition cursor-pointer pointer-events-auto shadow-xl",
                    isGlass ? "hover:bg-white/20 text-white hover:text-white bg-black/20" : "hover:bg-gray-500/20 bg-white shadow-lg text-black"
                )}
                style={{ position: 'fixed', zIndex: 99999 }} // Inline style force
                title="Cerrar Teleprompter"
            >
                <X size={32} />
            </button>
        </div>
    )
}
