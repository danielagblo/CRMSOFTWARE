'use client'

import searchIcon from '@/assets/search.svg'
import filterIcon from '@/assets/filter.svg'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onFilterClick?: () => void
}

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  onFilterClick
}: SearchBarProps) {
  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
      <div className="relative w-full sm:min-w-[18rem] sm:max-w-sm">
        <img
          className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
          src={searchIcon.src}
          alt=""
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-300 bg-white/95 pl-10 pr-3 py-2.5 text-sm shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
        />
      </div>
      {onFilterClick && (
        <button
          onClick={onFilterClick}
          type='button'
          className="rounded-xl border border-slate-300 bg-white p-2.5 shadow-sm transition-colors hover:bg-slate-50"
          title="Open filters"
        >
          <img
            className="h-5 w-5"
            src={filterIcon.src}
            alt=""
          />
        </button>
      )}
    </div>
  )
}
