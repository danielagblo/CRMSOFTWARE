'use client'

import { type ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow: string
  title: string
  description?: string
  action?: ReactNode
}

export default function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
      <div>
        <p className="text-sm uppercase font-semibold text-indigo-600">{eyebrow}</p>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{title}</h1>
        {description ? <p className="text-sm text-gray-500 mt-1">{description}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  )
}
