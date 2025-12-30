'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addSpeaker(formData: FormData) {
    const supabase = await createClient()

    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const cost = formData.get('cost') ? parseFloat(formData.get('cost') as string) : null

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    // Check local duplicate (by name OR email for this user)
    // Ideally we check email if provided, otherwise name
    let query = supabase.from('speakers').select('id').eq('user_id', user.id)
    if (email) {
        query = query.eq('email', email)
    } else {
        query = query.eq('name', name)
    }
    const { data: existing } = await query.single()

    if (existing) {
        return { success: true, id: existing.id }
    }

    const { data: newSpeaker, error } = await supabase.from('speakers').insert({
        user_id: user.id,
        name,
        email,
        default_cost_per_hour: cost
    }).select('id').single()

    if (error) {
        return { error: 'Error al crear orador: ' + error.message }
    }

    revalidatePath('/dashboard/speakers')
    return { success: true, id: newSpeaker.id }
}

export async function deleteSpeaker(formData: FormData) {
    const supabase = await createClient()

    const id = formData.get('id') as string
    if (!id) return { error: 'ID requerido' }

    const { error } = await supabase.from('speakers').delete().eq('id', id)

    if (error) {
        return { error: 'Error al eliminar' }
    }

    revalidatePath('/dashboard/speakers')
    return { success: true }
}
