// Utility function to make authenticated API calls
export async function fetchWithAuth(
  url: string,
  options: RequestInit & { headers?: Record<string, string> } = {}
) {
  // Get user from localStorage
  const userJson = localStorage.getItem('user')
  const user = userJson ? JSON.parse(userJson) : null

  if (!user) {
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
