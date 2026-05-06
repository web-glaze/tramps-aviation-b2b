'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: 'agent' | 'customer'
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { user, token, role } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    // Single-app deployment — every authenticated route lives on this
    // domain (the agent portal). No /b2c/* exists here.
    if (!token || !user) {
      router.push('/login')
      return
    }
    if (requiredRole && role !== requiredRole) {
      // Wrong role — send them home (agents go to dashboard, anyone
      // else sees the public flight search as a soft landing).
      router.push(role === 'agent' ? '/dashboard' : '/flights')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user, role, requiredRole])

  if (!token || !user) return null
  if (requiredRole && role !== requiredRole) return null

  return <>{children}</>
}
