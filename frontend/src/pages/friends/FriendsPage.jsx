import React, { useState, useEffect, useCallback, useRef } from "react"
import { UserPlus, Search, Check, X, Users } from "lucide-react"
import toast from "react-hot-toast"
import {
  getFriends,
  getRequests,
  sendRequest,
  acceptRequest,
  rejectRequest,
  removeFriend,
  searchUsers,
} from "../../api/friends"
import Avatar from "../../components/ui/Avatar"
import Spinner from "../../components/ui/Spinner"
import EmptyState from "../../components/ui/EmptyState"

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function FriendsPage() {
  const [friends, setFriends] = useState([])
  const [requests, setRequests] = useState([])
  const [loadingFriends, setLoadingFriends] = useState(true)
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [friendFilter, setFriendFilter] = useState("")
  const [removingId, setRemovingId] = useState(null)
  const [confirmRemove, setConfirmRemove] = useState(null)
  const searchRef = useRef(null)

  const debouncedSearch = useDebounce(searchQuery, 300)

  const fetchFriends = useCallback(async () => {
    try {
      setLoadingFriends(true)
      const res = await getFriends()
      setFriends(res.data.friends || [])
    } catch {
      toast.error("Failed to load friends")
    } finally {
      setLoadingFriends(false)
    }
  }, [])

  const fetchRequests = useCallback(async () => {
    try {
      setLoadingRequests(true)
      const res = await getRequests()
      setRequests(res.data.requests || [])
    } catch {
      toast.error("Failed to load requests")
    } finally {
      setLoadingRequests(false)
    }
  }, [])

  useEffect(() => {
    fetchFriends()
    fetchRequests()
  }, [fetchFriends, fetchRequests])

  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }
    const doSearch = async () => {
      try {
        setSearching(true)
        const res = await searchUsers(debouncedSearch)
        setSearchResults(res.data.users || [])
        setShowDropdown(true)
      } catch {
        // silently fail
      } finally {
        setSearching(false)
      }
    }
    doSearch()
  }, [debouncedSearch])

  const handleSendRequest = async (identifier) => {
    try {
      await sendRequest(identifier)
      toast.success("Friend request sent!")
      setSearchResults((prev) =>
        prev.map((u) => (u.username === identifier || u.email === identifier ? { ...u, requestSent: true } : u))
      )
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to send request")
    }
  }

  const handleAccept = async (id) => {
    try {
      await acceptRequest(id)
      toast.success("Friend request accepted!")
      setRequests((prev) => prev.filter((r) => r.id !== id))
      fetchFriends()
    } catch {
      toast.error("Failed to accept request")
    }
  }

  const handleReject = async (id) => {
    try {
      await rejectRequest(id)
      toast.success("Request rejected")
      setRequests((prev) => prev.filter((r) => r.id !== id))
    } catch {
      toast.error("Failed to reject request")
    }
  }

  const handleRemove = async (friendId) => {
    try {
      setRemovingId(friendId)
      await removeFriend(friendId)
      toast.success("Friend removed")
      setFriends((prev) => prev.filter((f) => f.id !== friendId))
      setConfirmRemove(null)
    } catch {
      toast.error("Failed to remove friend")
    } finally {
      setRemovingId(null)
    }
  }

  const filteredFriends = friends.filter(
    (f) =>
      f.name?.toLowerCase().includes(friendFilter.toLowerCase()) ||
      f.username?.toLowerCase().includes(friendFilter.toLowerCase())
  )

  return (
    <div className="px-6 py-6">
      <h1 className="text-2xl font-bold text-[--text-primary] mb-6" style={{ fontFamily: "Syne" }}>
        Friends
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* Search Section */}
          <div className="bg-[--bg-card] rounded-xl border border-[--border] p-5">
            <h2 className="text-sm font-semibold text-[--text-primary] mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[--accent]" />
              Add a Friend
            </h2>
            <div className="relative" ref={searchRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                  placeholder="Search by username or email"
                  className="w-full bg-[--bg-elevated] border border-[--border] rounded-lg pl-9 pr-3 py-2 text-[--text-primary] text-sm placeholder:text-[--text-muted] focus:outline-none focus:border-[--border-focus] focus:ring-1 focus:ring-[--accent]/30 transition-colors"
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Spinner size="sm" />
                  </div>
                )}
              </div>

              {showDropdown && searchResults.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full bg-[--bg-elevated] border border-[--border] rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {searchResults.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 p-3 hover:bg-[--bg-hover] transition-colors"
                    >
                      <Avatar username={u.username} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[--text-primary] truncate">
                          {u.name || u.username}
                        </div>
                        <div className="text-xs text-[--text-muted]">@{u.username}</div>
                      </div>
                      {u.isFriend ? (
                        <span className="text-xs px-2 py-1 rounded bg-[--success]/10 text-[--success] border border-[--success]/20">
                          Friends
                        </span>
                      ) : u.requestSent ? (
                        <span className="text-xs px-2 py-1 rounded bg-[--warn]/10 text-[--warn] border border-[--warn]/20">
                          Pending
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(u.username)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-[--accent] text-white hover:bg-[--accent-hover] font-medium"
                        >
                          Add Friend
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {showDropdown && searchResults.length === 0 && !searching && debouncedSearch && (
                <div className="absolute z-10 top-full mt-1 w-full bg-[--bg-elevated] border border-[--border] rounded-lg p-4 text-sm text-[--text-muted] text-center">
                  No users found
                </div>
              )}
            </div>
          </div>

          {/* Incoming Requests */}
          {!loadingRequests && requests.length > 0 && (
            <div className="bg-[--bg-card] rounded-xl border border-[--border] p-5">
              <h2 className="text-sm font-semibold text-[--text-primary] mb-3 flex items-center gap-2">
                Friend Requests
                <span className="px-1.5 py-0.5 rounded-full bg-[--accent]/20 text-[--accent] text-xs font-mono">
                  {requests.length}
                </span>
              </h2>
              <div className="space-y-3">
                {requests.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-3 bg-[--bg-elevated] rounded-lg">
                    <Avatar username={r.sender?.username || "?"} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[--text-primary]">
                        {r.sender?.name || r.sender?.username}
                      </div>
                      <div className="text-xs text-[--text-muted]">
                        @{r.sender?.username} · {r.createdAt ? `sent recently` : ""}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(r.id)}
                        className="p-1.5 rounded-lg bg-[--success]/10 text-[--success] border border-[--success]/20 hover:bg-[--success]/20"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleReject(r.id)}
                        className="p-1.5 rounded-lg bg-[--danger]/10 text-[--danger] border border-[--danger]/20 hover:bg-[--danger]/20"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN — Friends List */}
        <div className="bg-[--bg-card] rounded-xl border border-[--border] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[--text-primary] flex items-center gap-2">
              <Users className="w-4 h-4 text-[--accent]" />
              Your Friends
              <span className="font-mono text-[--text-muted] text-xs">({friends.length})</span>
            </h2>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted]" />
            <input
              type="text"
              value={friendFilter}
              onChange={(e) => setFriendFilter(e.target.value)}
              placeholder="Filter friends..."
              className="w-full bg-[--bg-elevated] border border-[--border] rounded-lg pl-9 pr-3 py-2 text-[--text-primary] text-sm placeholder:text-[--text-muted] focus:outline-none focus:border-[--border-focus] focus:ring-1 focus:ring-[--accent]/30 transition-colors"
            />
          </div>

          {loadingFriends ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 bg-[--bg-elevated] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredFriends.length === 0 ? (
            <EmptyState
              title="No friends yet"
              description="Search above to add some friends"
            />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredFriends.map((f) => (
                <div
                  key={f.id}
                  className="bg-[--bg-elevated] rounded-xl p-4 border border-[--border] flex flex-col items-center text-center"
                >
                  <Avatar username={f.username} size="lg" />
                  <div className="mt-2 text-sm font-medium text-[--text-primary] truncate w-full">
                    {f.name || f.username}
                  </div>
                  <div className="text-xs text-[--text-muted] mb-3">@{f.username}</div>

                  {confirmRemove === f.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleRemove(f.id)}
                        disabled={removingId === f.id}
                        className="text-xs px-2 py-1 rounded-lg bg-[--danger]/10 text-[--danger] border border-[--danger]/30 hover:bg-[--danger]/20"
                      >
                        {removingId === f.id ? "..." : "Confirm"}
                      </button>
                      <button
                        onClick={() => setConfirmRemove(null)}
                        className="text-xs px-2 py-1 rounded-lg bg-[--bg-hover] text-[--text-muted]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmRemove(f.id)}
                      className="text-xs text-[--text-muted] hover:text-[--danger] transition-colors"
                    >
                      Remove Friend
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
