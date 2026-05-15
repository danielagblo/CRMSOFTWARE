'use client'

import mailIcon from '../../assets/at-sign.svg'
import lockIcon from '../../assets/padlock.svg'
import skyTechLogo from '../../assets/skytechLogo.png'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { signIn, getSession } from 'next-auth/react'

const SUPER_USER_EMAIL = 'admin@crm.com'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid credentials')
        return
      }

      // Keep localStorage for backward compatibility with some components
      const session = await getSession()
      if (session?.user) {
        localStorage.setItem('user', JSON.stringify({
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          role: session.user.role
        }))
      } else {
        const userData = {
          id: 'admin_fallback_id',
          name: email === SUPER_USER_EMAIL ? 'SkyTech' : 'Team Member',
          email,
          role: email === SUPER_USER_EMAIL ? 'ADMIN' : 'SALES'
        }
        localStorage.setItem('user', JSON.stringify(userData))
      }
      // Force a full browser reload so layout components (like Navigation) remount and re-read localStorage
      window.location.href = session?.user?.role === 'ADMIN' ? '/dashboard' : '/pipeline'
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-(--light-blue)/95">
      <div className="max-w-md w-full space-y-8 bg-white/45 rounded-2xl shadow-[8px_8px_12px_4px_#032a4219] p-8">
        <div>
          <div className="flex items-center justify-center w-24 h-24 rounded-xl mx-auto">
            <img src={skyTechLogo.src} alt="logo" className="w-full h-full object-contain" />
          </div>
          <h2 className=" text-center text-3xl text-[] font-bold text-(--dark-blue)">CRM Pro</h2>
          <p className="mt-1 text-center text-gray-800">Sign in to your account</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-800 mb-2">Email address</label>
              <div className="relative">
                <img className='absolute top-3 left-3 h-5 w-5' src={mailIcon.src} alt="email" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full pl-12 pr-4 py-2 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-800 mb-2">Password</label>
              <div className="relative">
                <img className='absolute top-3 left-3 h-5 w-5' src={lockIcon.src} alt="password" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full pl-12 pr-4 py-2 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                placeholder="*****"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              </div>
            </div>
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full text-(--light-blue) flex justify-center py-2 px-4 rounded-lg bg-(--dark-blue) transition"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}