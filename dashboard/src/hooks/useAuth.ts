import { useEffect, useState } from 'react'
import { supabase, type Client } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
    const [user, setUser] = useState<User | null>(null)
    const [client, setClient] = useState<Client | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null)
            if (session?.user) {
                fetchClientData(session.user.id)
            } else {
                setLoading(false)
            }
        })

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
            if (session?.user) {
                fetchClientData(session.user.id)
            } else {
                setClient(null)
                setLoading(false)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const fetchClientData = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('id', userId)
                .single()

            if (error) throw error
            setClient(data)
        } catch (error) {
            console.error('Error fetching client data:', error)
        } finally {
            setLoading(false)
        }
    }

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })
        return { error }
    }

    const signUp = async (email: string, password: string, companyName: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        })

        if (!error && data.user) {
            // Create client profile
            const { error: profileError } = await supabase
                .from('clients')
                .insert({
                    id: data.user.id,
                    email,
                    company_name: companyName,
                    user_role: 'client',
                })

            if (profileError) {
                return { error: profileError }
            }
        }

        return { error, data }
    }

    const resetPassword = async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password',
        })
        return { error }
    }

    const updatePassword = async (newPassword: string) => {
        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        })
        return { error }
    }

    const signOut = async () => {
        const { error } = await supabase.auth.signOut()
        return { error }
    }

    return {
        user,
        client,
        loading,
        signIn,
        signUp,
        resetPassword,
        updatePassword,
        signOut,
        isTeam: client?.user_role === 'team',
    }
}
