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
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center *:gap-4 mb-6">
      <div>
        <p className="text-sm uppercase font-semibold text-(--dark-brown)">{eyebrow}</p>
        <h1 className="text-2xl md:text-3xl font-bold text-(--dark-blue)">{title}</h1>
        {description ? <p className="text-sm text-gray-600 mt-1">{description}</p> : null}
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
