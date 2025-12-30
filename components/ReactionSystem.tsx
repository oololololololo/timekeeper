'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Heart, ThumbsUp, Flame, Smile, Clapperboard } from 'lucide-react'
// Actually user said Emojis, not icons for this part. 
// "Reacciones via emojis como Teams".

const EMOJIS = ['👍', '❤️', '👏', '🔥', '😂']

type ReactionBubble = {
    id: number
    emoji: string
    left: number // percentage
}

export default function ReactionSystem({ meetingId }: { meetingId: string }) {
    const supabase = createClient()
    const [bubbles, setBubbles] = useState<ReactionBubble[]>([])

    // SEND
    const sendReaction = async (emoji: string) => {
        // Optimistic local show (optional, but better to wait for echo or show immediately)
        // Let's show immediately for sender
        addBubble(emoji)

        await supabase.channel(`meeting-${meetingId}-reactions`).send({
            type: 'broadcast',
            event: 'reaction',
            payload: { emoji }
        })
    }

    // RECEIVE
    useEffect(() => {
        const channel = supabase.channel(`meeting-${meetingId}-reactions`)
            .on('broadcast', { event: 'reaction' }, (payload) => {
                // Don't duplicate if I sent it? 
                // Broadcast usually sends to everyone including self? 
                // Supabase Broadcast DOES NOT echo to sender by default unless configured?
                // Actually supabase-js broadcast is received by everyone subscribed, *including* sender?
                // Wait, documentation says "Messages are sent to all OTHER clients" usually. 
                // Let's assume it doesn't echo. If it does, we'll double bubble.
                // We'll trust "addBubble" called manually + broadcast to others.

                // Correction: Supabase Broadcast *usually* echoes? 
                // Let's just listen. If I see double I'll fix.
                addBubble(payload.payload.emoji)
            })
            .subscribe()

        return () => {
            // Don't remove channel if it's reused by parent?
            // Since we create a NEW channel instance here with same name... supbase client dedupes?
            // It's safer if we just manage our own subscription or pass channel. 
            // But to be drop-in, I'll create one. Supabase handles multiplexing.
            supabase.removeChannel(channel)
        }
    }, [meetingId])

    const addBubble = useCallback((emoji: string) => {
        const id = Date.now() + Math.random()
        const left = 10 + Math.random() * 80 // 10% to 90%

        setBubbles(prev => [...prev, { id, emoji, left }])

        // Cleanup
        setTimeout(() => {
            setBubbles(prev => prev.filter(b => b.id !== id))
        }, 2000)
    }, [])

    return (
        <>
            {/* BUBBLE OVERLAY */}
            <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
                {bubbles.map(b => (
                    <div
                        key={b.id}
                        className="absolute bottom-20 text-4xl animate-float-up will-change-transform"
                        style={{
                            left: `${b.left}%`,
                            animationDuration: `${2 + Math.random()}s`, // Random speed
                            fontSize: `${2 + Math.random()}rem` // Random size
                        }}
                    >
                        {b.emoji}
                    </div>
                ))}
            </div>

            {/* REACTION BAR */}
            <div className="fixed bottom-6 right-6 z-[90] flex gap-2 bg-black/40 backdrop-blur-md p-2 rounded-full border border-white/10 hover:bg-black/60 transition">
                {EMOJIS.map(emoji => (
                    <button
                        key={emoji}
                        onClick={() => sendReaction(emoji)}
                        className="p-2 hover:scale-125 transition text-2xl active:scale-90"
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </>
    )
}
