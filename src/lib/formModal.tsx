'use client'

import { type ReactNode } from 'react'
import { X } from 'lucide-react'

interface FormModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  panelClassName?: string
}

export default function FormModal({
  isOpen,
  onClose,
  title,
  children,
  panelClassName = ''
}: FormModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm"
      onClick={onClose}
      aria-hidden="true"
    >
      <div className="absolute inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center md:p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full bg-white shadow-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl border border-slate-200 md:max-w-3xl md:rounded-2xl ${panelClassName}`}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute cursor-pointer right-3 top-3 rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close form modal"
          >
            <X size={38} />
          </button>

          <div className="px-4 pt-12 pb-2 md:px-6 md:pt-12">
            <h2 className="text-lg lg:text-xl font-semibold text-slate-900">{title}</h2>
          </div>

          <div>{children}</div>
        </div>
      </div>
    </div>
  )
}
