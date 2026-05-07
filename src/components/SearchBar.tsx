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
    <div className="flex gap-2 max-sm:mt-3">
      <div className="relative flex-1 max-w-sm">
        <img
          className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
          src={searchIcon.src}
          alt="search"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      {onFilterClick && (
        <button
          onClick={onFilterClick}
          className="rounded-lg border border-gray-300 bg-white p-2 hover:bg-gray-50 transition-colors"
          title="Open filters"
        >
          <img
            className="h-5 w-5"
            src={filterIcon.src}
            alt="filter"
          />
        </button>
      )}
    </div>
  )
}
