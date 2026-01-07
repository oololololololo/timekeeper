'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return { error: 'Credenciales incorrectas o error en el sistema.' }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard') // Or wherever we want to land them
}

export async function signInWithGoogle() {
    const supabase = await createClient()

    // Determine the base URL
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!baseUrl && process.env.VERCEL_URL) {
        baseUrl = `https://${process.env.VERCEL_URL}`
    }
    if (!baseUrl) {
        baseUrl = 'http://localhost:3000'
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${baseUrl}/auth/callback`,
        },
    })

    if (data.url) {
        redirect(data.url)
    }

    if (error) {
        return { error: 'Error iniciando sesión con Google' }
    }
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            // Redirect to callback route to verify email
            emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/callback`,
        }
    })

    if (error) {
        return { error: 'Error al registrarse. Intenta con otro email.' }
    }

    // If email confirmation is enabled, we stay here. 
    // If not, we could redirect, but usually signup requires email check.
    return { success: true }
}

export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
}
