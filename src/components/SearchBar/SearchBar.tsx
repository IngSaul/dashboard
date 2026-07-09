import { useState, type FormEvent } from 'react'
import { buildSearchUrl } from '../../services/search'
import type { SearchPreference } from '../../types/dashboard'
import './SearchBar.css'

export interface SearchBarProps {
  searchPreference: SearchPreference
}

export function SearchBar({ searchPreference }: SearchBarProps) {
  const [query, setQuery] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const url = buildSearchUrl(searchPreference, query)
    if (url === null) {
      return
    }
    if (searchPreference.openBehavior === 'newTab') {
      window.open(url, '_blank', 'noopener')
    } else {
      window.location.assign(url)
    }
  }

  return (
    <form role="search" aria-label="Site search" className="search-bar" onSubmit={handleSubmit}>
      <input
        type="text"
        aria-label="Search"
        placeholder={`Search with ${searchPreference.providerName}`}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="search-bar__input"
      />
      <button type="submit" className="search-bar__submit">
        Search
      </button>
    </form>
  )
}
