'use client'

import { type ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow: string
  title: string
  description?: string
  action?: ReactNode
  leftAction?: ReactNode
}

export default function PageHeader({ eyebrow, title, description, action, leftAction }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm uppercase font-semibold text-indigo-600">{eyebrow}</p>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{title}</h1>
        {description ? <p className="text-sm text-gray-500 mt-1">{description}</p> : null}
      </div>
      {(action || leftAction) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          {leftAction ? <div>{leftAction}</div> : <div />}
          {action ? <div>{action}</div> : null}
        </div>
      )}
    </div>
  )
}
