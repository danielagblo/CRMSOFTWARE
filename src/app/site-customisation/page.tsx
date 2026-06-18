import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import SiteCustomisationClient from '@/components/SiteCustomisationClient'

export default async function SiteCustomisationPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/pipeline')
  }

  return <SiteCustomisationClient />
}
