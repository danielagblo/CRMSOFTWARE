import { Suspense } from 'react'
import LeadsClient from './LeadsClient'

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-gray-600">Loading leads...</div>
    </Suspense>}>
      <LeadsClient />
    </Suspense>
  )
}
