import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

import { ServerToClientEvents, ClientToServerEvents } from '@ih3t/shared'
function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null)
  const [sessionId, setSessionId] = useState<string>('')
  const [players, setPlayers] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Connect to the server
    const socket = io('http://localhost:3001')
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('Connected to server')
      setIsConnected(true)
    })

    socket.on('disconnect', () => {
      console.log('Disconnected from server')
      setIsConnected(false)
    })

    socket.on('player-joined', (data: { players: string[] }) => {
      console.log('Player joined:', data)
      setPlayers(data.players)
    })

    socket.on('player-left', (data: { players: string[] }) => {
      console.log('Player left:', data)
      setPlayers(data.players)
    })

    socket.on('game-action', (data: { playerId: string; action: any }) => {
      console.log('Game action received:', data)
      // Handle game actions here
    })

    socket.on('error', (error: string) => {
      console.error('Socket error:', error)
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Draw background
    ctx.fillStyle = isConnected ? 'green' : 'red'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw connection status
    ctx.fillStyle = 'white'
    ctx.font = '24px Arial'
    ctx.fillText(`Connected: ${isConnected}`, 20, 40)
    ctx.fillText(`Session: ${sessionId || 'None'}`, 20, 70)
    ctx.fillText(`Players: ${players.length}`, 20, 100)

    // Handle resize
    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      ctx.fillStyle = isConnected ? 'green' : 'red'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = 'white'
      ctx.font = '24px Arial'
      ctx.fillText(`Connected: ${isConnected}`, 20, 40)
      ctx.fillText(`Session: ${sessionId || 'None'}`, 20, 70)
      ctx.fillText(`Players: ${players.length}`, 20, 100)
    }

    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [isConnected, sessionId, players])

  const createSession = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxPlayers: 4 })
      })
      const data = await response.json()
      setSessionId(data.sessionId)
      socketRef.current?.emit('join-session', data.sessionId)
    } catch (error) {
      console.error('Failed to create session:', error)
    }
  }

  const joinSession = () => {
    const id = prompt('Enter session ID:')
    if (id && socketRef.current) {
      setSessionId(id)
      socketRef.current.emit('join-session', id)
    }
  }

  const leaveSession = () => {
    if (sessionId && socketRef.current) {
      socketRef.current.emit('leave-session', sessionId)
      setSessionId('')
      setPlayers([])
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%'
        }}
      />
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {!sessionId ? (
          <>
            <button onClick={createSession}>Create Session</button>
            <button onClick={joinSession}>Join Session</button>
          </>
        ) : (
          <button onClick={leaveSession}>Leave Session</button>
        )}
      </div>
    </div>
  )
}

export default App
