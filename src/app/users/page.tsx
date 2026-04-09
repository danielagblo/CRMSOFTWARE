import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import UsersList from '@/components/UsersList'

export default async function UsersPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-full mx-auto py-6 sm:px-6 lg:px-8 2xl:px-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div>
              <p className="text-sm font-medium text-indigo-600">User Management</p>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Users</h1>
              <p className="text-sm text-gray-500 mt-1">Manage your team members and their access levels.</p>
            </div>
          </div>

          <UsersList initialUsers={users} />
        </div>
      </div>
    </div>
  )
}
