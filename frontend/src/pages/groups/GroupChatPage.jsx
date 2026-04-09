import React, { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Send, MessageSquare, Info, Search } from "lucide-react"
import toast from "react-hot-toast"
import { getGroups, getMessages, sendMessage } from "../../api/groups"
import { formatRelative, formatDate } from "../../utils/formatDate"
import { formatCurrency } from "../../utils/formatCurrency"
import Avatar from "../../components/ui/Avatar"
import Spinner from "../../components/ui/Spinner"
import { useAuth } from "../../hooks/useAuth"
import { useSocket } from "../../hooks/useSockets"

function DateSeparator({ date }) {
  const now = new Date()
  const d = new Date(date)
  const isToday = d.toDateString() === now.toDateString()
  const isYesterday =
    new Date(now - 86400000).toDateString() === d.toDateString()
  const label = isToday ? "Today" : isYesterday ? "Yesterday" : formatDate(date)
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-[--border]" />
      <span className="text-xs text-[--text-muted] px-2">{label}</span>
      <div className="flex-1 h-px bg-[--border]" />
    </div>
  )
}

export default function GroupChatPage() {
  const { groupId: paramGroupId } = useParams()
  const { user } = useAuth()
  const { socket } = useSocket()
  const navigate = useNavigate()

  const [groups, setGroups] = useState([])
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [selectedGroupId, setSelectedGroupId] = useState(paramGroupId || null)
  const [messages, setMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [groupSearch, setGroupSearch] = useState("")
  const [unreadCounts, setUnreadCounts] = useState({})
  const [showMembers, setShowMembers] = useState(false)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  const selectedGroup = groups.find((g) => g.id === selectedGroupId)

  const fetchGroups = useCallback(async () => {
    try {
      setLoadingGroups(true)
      const res = await getGroups()
      setGroups(res.data.groups || [])
    } catch {
      toast.error("Failed to load groups")
    } finally {
      setLoadingGroups(false)
    }
  }, [])

  const fetchMessages = useCallback(async (gId) => {
    try {
      setLoadingMessages(true)
      const res = await getMessages(gId, { limit: 50 })
      setMessages((res.data.messages || []).reverse())
      setUnreadCounts((prev) => ({ ...prev, [gId]: 0 }))
    } catch {
      toast.error("Failed to load messages")
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  useEffect(() => {
    if (selectedGroupId) {
      fetchMessages(selectedGroupId)
      navigate(`/groups/${selectedGroupId}`, { replace: true })
    }
  }, [selectedGroupId, fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (!socket) return
    const handler = ({ message, user: msgUser, groupId }) => {
      if (groupId === selectedGroupId) {
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), message, user: msgUser, createdAt: new Date().toISOString() },
        ])
      } else {
        setUnreadCounts((prev) => ({ ...prev, [groupId]: (prev[groupId] || 0) + 1 }))
      }
    }
    socket.on("group:message", handler)
    return () => socket.off("group:message", handler)
  }, [socket, selectedGroupId])

  const handleSend = async () => {
    if (!input.trim() || !selectedGroupId) return
    const text = input.trim()
    setInput("")

    // Optimistic
    const tempMsg = {
      id: `temp-${Date.now()}`,
      message: text,
      user: { id: user?.id, username: user?.username, name: user?.name },
      createdAt: new Date().toISOString(),
      isTemp: true,
    }
    setMessages((prev) => [...prev, tempMsg])

    try {
      setSending(true)
      await sendMessage(selectedGroupId, { message: text })
      if (socket) {
        socket.emit("group:message", { groupId: selectedGroupId, message: text })
      }
    } catch {
      toast.error("Failed to send message")
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id))
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const filteredGroups = groups.filter((g) =>
    g.name?.toLowerCase().includes(groupSearch.toLowerCase())
  )

  // Group messages by date for separators
  const renderMessages = () => {
    const elements = []
    let lastDate = null
    messages.forEach((msg, idx) => {
      const msgDate = new Date(msg.createdAt).toDateString()
      if (msgDate !== lastDate) {
        elements.push(<DateSeparator key={`sep-${idx}`} date={msg.createdAt} />)
        lastDate = msgDate
      }
      const isOwn = msg.user?.id === user?.id
      const prevMsg = messages[idx - 1]
      const showAvatar = !isOwn && prevMsg?.user?.id !== msg.user?.id

      elements.push(
        <div key={msg.id} className={`flex gap-2 mb-1 ${isOwn ? "justify-end" : "justify-start"}`}>
          {!isOwn && (
            <div className="w-7 flex-shrink-0 flex items-end">
              {showAvatar && <Avatar username={msg.user?.username || "?"} size="sm" />}
            </div>
          )}
          <div className={`max-w-xs lg:max-w-md ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
            {showAvatar && !isOwn && (
              <span className="text-xs font-semibold text-[--text-secondary] mb-0.5 ml-1">
                {msg.user?.name || msg.user?.username}
              </span>
            )}
            {msg.expenseId && (
              <div className="mb-1 flex items-center gap-1.5 text-xs text-[--info] bg-[--info]/10 border border-[--info]/20 rounded-lg px-2 py-1">
                <span>🧾</span>
                <span>Linked expense</span>
              </div>
            )}
            <div
              className={`px-3 py-2 rounded-xl text-sm ${
                isOwn
                  ? "bg-[--accent]/20 text-[--text-primary] rounded-tr-sm"
                  : "bg-[--bg-elevated] text-[--text-primary] rounded-tl-sm"
              }`}
            >
              {msg.message}
            </div>
            <span className="text-xs text-[--text-muted] mt-0.5 px-1">
              {formatRelative(msg.createdAt)}
            </span>
          </div>
        </div>
      )
    })
    return elements
  }

  return (
    <div className="flex h-full" style={{ height: "calc(100vh - 64px)" }}>
      {/* LEFT PANEL */}
      <div className="w-72 flex-shrink-0 bg-[--bg-card] border-r border-[--border] flex flex-col">
        <div className="p-4 border-b border-[--border]">
          <h2 className="text-sm font-semibold text-[--text-primary] mb-3">Your Groups</h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[--text-muted]" />
            <input
              value={groupSearch}
              onChange={(e) => setGroupSearch(e.target.value)}
              placeholder="Search groups..."
              className="w-full bg-[--bg-elevated] border border-[--border] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[--text-primary] placeholder:text-[--text-muted] focus:outline-none focus:border-[--border-focus]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingGroups ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-[--bg-elevated] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="p-6 text-center text-xs text-[--text-muted]">No groups found</div>
          ) : (
            filteredGroups.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedGroupId(g.id)}
                className={`w-full flex items-start gap-3 p-3 text-left transition-colors hover:bg-[--bg-hover] ${
                  selectedGroupId === g.id
                    ? "bg-[--accent-glow] border-l-2 border-[--accent]"
                    : "border-l-2 border-transparent"
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-[--accent]/20 flex items-center justify-center text-[--accent] text-xs font-bold flex-shrink-0">
                  {g.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[--text-primary] truncate">{g.name}</span>
                    {unreadCounts[g.id] > 0 && (
                      <span className="ml-1 text-xs bg-[--accent] text-white rounded-full px-1.5 py-0.5 font-mono">
                        {unreadCounts[g.id]}
                      </span>
                    )}
                  </div>
                  {g.lastMessage && (
                    <div className="text-xs text-[--text-muted] truncate mt-0.5">
                      {g.lastMessage.message}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANEL */}
      {!selectedGroupId ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageSquare className="w-12 h-12 text-[--text-muted] mx-auto mb-3" />
            <div className="text-[--text-secondary] font-medium">Select a group to start chatting</div>
            <div className="text-xs text-[--text-muted] mt-1">
              Groups are created automatically with shared expenses
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat Topbar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[--border] bg-[--bg-card]">
            <div>
              <div className="font-semibold text-[--text-primary] text-sm">
                {selectedGroup?.name}
              </div>
              <div className="text-xs text-[--text-muted]">
                {selectedGroup?.members?.length || 0} members
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Avatar stack */}
              <div className="flex -space-x-2">
                {(selectedGroup?.members || []).slice(0, 3).map((m) => (
                  <div key={m.id} className="ring-2 ring-[--bg-card] rounded-full">
                    <Avatar username={m.username} size="sm" />
                  </div>
                ))}
                {(selectedGroup?.members?.length || 0) > 3 && (
                  <div className="w-7 h-7 rounded-full bg-[--bg-elevated] border-2 border-[--bg-card] flex items-center justify-center text-xs text-[--text-muted]">
                    +{selectedGroup.members.length - 3}
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowMembers(!showMembers)}
                className="p-1.5 rounded-lg text-[--text-muted] hover:text-[--text-primary] hover:bg-[--bg-hover]"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5">
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <Spinner />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[--text-muted] text-sm">
                No messages yet. Say something!
              </div>
            ) : (
              <>
                {renderMessages()}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Bar */}
          <div className="p-4 border-t border-[--border] bg-[--bg-card]">
            <div className="flex items-end gap-3">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 bg-[--bg-elevated] border border-[--border] rounded-lg px-3 py-2 text-[--text-primary] text-sm placeholder:text-[--text-muted] focus:outline-none focus:border-[--border-focus] focus:ring-1 focus:ring-[--accent]/30 resize-none transition-colors"
                style={{ maxHeight: "100px" }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="p-2.5 rounded-lg bg-[--accent] text-white hover:bg-[--accent-hover] disabled:opacity-40 transition-colors flex-shrink-0"
              >
                {sending ? <Spinner size="sm" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <div className="text-xs text-[--text-muted] mt-1.5">
              Press Enter to send · Shift+Enter for new line
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
