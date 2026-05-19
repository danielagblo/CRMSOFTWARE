import { getServerSession } from 'next-auth'
import type { Session } from 'next-auth'
import { authOptions } from './auth'

export type SessionUser = NonNullable<Session['user']>

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions)
  return session?.user ?? null
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  return user
}
