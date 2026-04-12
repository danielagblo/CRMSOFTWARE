import { getSession } from 'next-auth/react'

// Utility function to make authenticated API calls
export async function fetchWithAuth(
  url: string,
  options: RequestInit & { headers?: Record<string, string> } = {}
) {
  // Get user from localStorage first for backward compatibility
  const userJson = localStorage.getItem('user')
  let user = userJson ? JSON.parse(userJson) : null

  // Fallback to NextAuth session when local storage is stale/missing id
  if (!user?.id) {
    const session = await getSession()
    if (session?.user?.id) {
      user = {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role
      }
      localStorage.setItem('user', JSON.stringify(user))
    }
  }

  if (!user?.id) {
    throw new Error('User not authenticated')
  }

  // Add auth headers
  const headers = {
    'Content-Type': 'application/json',
    'X-User-Id': user.id,
    'X-User-Role': user.role,
    ...options.headers,
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  return response
}
