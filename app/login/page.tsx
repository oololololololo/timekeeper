'use client'

import { login, signup } from '../auth/actions'
import { useState } from 'react'
import { Loader2, Mail, Lock, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [mode, setMode] = useState<'login' | 'signup'>('login')
    const [message, setMessage] = useState<string | null>(null)

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true)
        setMessage(null)

        try {
            const action = mode === 'login' ? login : signup
            const result = await action(formData)

            if (result?.error) {
                setMessage(result.error)
            } else if (mode === 'signup' && !result?.error) {
                setMessage('¡Cuenta creada! Revisa tu correo para confirmar.')
            }
        } catch (e) {
            setMessage('Ocurrió un error inesperado.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#1a1a2e] px-4">
            <div className="w-full max-w-md bg-white/5 border border-white/10 p-8 rounded-3xl shadow-2xl backdrop-blur-xl">

                <div className="text-center mb-8">
                    <Link href="/" className="inline-block text-4xl mb-2">⏱️</Link>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        {mode === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
                    </h1>
                    <p className="text-gray-400 text-sm">
                        {mode === 'login'
                            ? 'Ingresa para gestionar tus oradores y métricas.'
                            : 'Empieza a optimizar tus reuniones hoy mismo.'}
                    </p>
                </div>

                <form action={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" />
                            <input
                                name="email"
                                type="email"
                                required
                                placeholder="tu@email.com"
                                className="w-full bg-black/20 border border-white/10 focus:border-[#667eea] text-white rounded-xl py-3 pl-12 pr-4 outline-none transition-colors"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Contraseña</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" />
                            <input
                                name="password"
                                type="password"
                                required
                                placeholder="••••••••"
                                className="w-full bg-black/20 border border-white/10 focus:border-[#667eea] text-white rounded-xl py-3 pl-12 pr-4 outline-none transition-colors"
                            />
                        </div>
                    </div>

                    {message && (
                        <div className={`p-3 rounded-lg text-sm text-center ${message.includes('error') || message.includes('incorrectos') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-[#667eea] hover:bg-[#5a6fd6] text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 group"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                            <>
                                {mode === 'login' ? 'Ingresar' : 'Registrarse'}
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-gray-400 text-sm">
                        {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
                        <button
                            onClick={() => {
                                setMode(mode === 'login' ? 'signup' : 'login')
                                setMessage(null)
                            }}
                            className="ml-2 text-[#667eea] hover:text-white font-bold transition-colors"
                        >
                            {mode === 'login' ? 'Regístrate gratis' : 'Inicia Sesión'}
                        </button>
                    </p>
                </div>

            </div>
        </div>
    )
}
