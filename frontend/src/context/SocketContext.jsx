import { createContext, useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import { SOCKET_URL } from '../api/axios'
import { useAuth } from '../hooks/useAuth'

export const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const socketRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const settlementCallbacksRef = useRef([])
  const groupMessageCallbacksRef = useRef([])

  useEffect(() => {
    if (!isAuthenticated) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
        setIsConnected(false)
      }
      return
    }

    const token = localStorage.getItem('token')
    const socket = io(SOCKET_URL || undefined, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
    })

    socket.on('connect', () => setIsConnected(true))
    socket.on('disconnect', () => setIsConnected(false))

    socket.on('settlement:updated', (payload) => {
      settlementCallbacksRef.current.forEach((cb) => cb(payload))
    })

    socket.on('group:message', (payload) => {
      groupMessageCallbacksRef.current.forEach((cb) => cb(payload))
    })

    socketRef.current = socket
    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [isAuthenticated])

  const onSettlementUpdate = useCallback((cb) => {
    settlementCallbacksRef.current.push(cb)
    return () => {
      settlementCallbacksRef.current = settlementCallbacksRef.current.filter((x) => x !== cb)
    }
  }, [])

  const onGroupMessage = useCallback((cb) => {
    groupMessageCallbacksRef.current.push(cb)
    return () => {
      groupMessageCallbacksRef.current = groupMessageCallbacksRef.current.filter((x) => x !== cb)
    }
  }, [])

  const emitGroupMessage = useCallback((groupId, message, expenseId) => {
    if (socketRef.current) {
      socketRef.current.emit('group:message', { groupId, message, expenseId })
    }
  }, [])

  const joinGroup = useCallback((groupId) => {
    if (socketRef.current) {
      socketRef.current.emit('group:join', { groupId })
    }
  }, [])

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      isConnected,
      onSettlementUpdate,
      onGroupMessage,
      emitGroupMessage,
      joinGroup,
    }}>
      {children}
    </SocketContext.Provider>
  )
}
