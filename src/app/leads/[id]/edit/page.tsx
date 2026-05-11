'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function EditLeadRedirectPage() {
  const params = useParams()
  const router = useRouter()

  useEffect(() => {
    if (!params.id) return
    router.replace(`/leads?edit=${params.id}`)
  }, [params.id, router])

  return <div className="flex justify-center items-center min-h-screen">Redirecting...</div>
}
