import { useState, useEffect, useRef, useCallback } from 'react'
import { Search } from 'lucide-react'
import Avatar from '../ui/Avatar'
import { getFriends } from '../../api/friends'

export default function FriendSearchInput({ onSelect, excludeIds = [], placeholder = 'Search friends...' }) {
  const [query, setQuery]       = useState('')
  const [friends, setFriends]   = useState([])
  const [filtered, setFiltered] = useState([])
  const [open, setOpen]         = useState(false)
  const [active, setActive]     = useState(-1)
  const inputRef = useRef(null)
  const listRef  = useRef(null)

  useEffect(() => {
    getFriends().then(r => setFriends(r.data.friends || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!query.trim()) { setFiltered([]); setOpen(false); return }
    const q = query.toLowerCase()
    const res = friends.filter(f =>
      !excludeIds.includes(f.id) &&
      (f.username?.toLowerCase().includes(q) || f.name?.toLowerCase().includes(q))
    )
    setFiltered(res)
    setOpen(res.length > 0)
    setActive(-1)
  }, [query, friends, excludeIds])

  const select = useCallback((f) => {
    onSelect(f)
    setQuery('')
    setOpen(false)
  }, [onSelect])

  const onKeyDown = (e) => {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    if (e.key === 'Enter' && active >= 0) { e.preventDefault(); select(filtered[active]) }
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => filtered.length && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="input-base pl-9"
        />
      </div>

      {open && (
        <div
          ref={listRef}
          className="absolute z-20 w-full mt-1 rounded-lg border shadow-xl overflow-hidden"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
        >
          {filtered.map((f, i) => (
            <button
              key={f.id}
              onMouseDown={() => select(f)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
              style={{ background: i === active ? 'var(--bg-hover)' : 'transparent' }}
              onMouseEnter={() => setActive(i)}
            >
              <Avatar username={f.username} name={f.name} size="sm" />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{f.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>@{f.username}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}