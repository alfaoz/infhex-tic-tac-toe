import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { BoardState, ServerToClientEvents, ClientToServerEvents, SessionInfo, SessionState } from '@ih3t/shared'
import GameScreen from './components/GameScreen'
import LobbyScreen from './components/LobbyScreen'
import WaitingScreen from './components/WaitingScreen'
import WinnerScreen from './components/WinnerScreen'

type ScreenState = 'lobby' | 'waiting' | 'playing' | 'winner'

function App() {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null)
  const sessionIdRef = useRef<string>('')
  const [screenState, setScreenState] = useState<ScreenState>('lobby')
  const [sessionId, setSessionId] = useState<string>('')
  const [players, setPlayers] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [availableSessions, setAvailableSessions] = useState<SessionInfo[]>([])
  const [isHost, setIsHost] = useState(false)
  const [boardState, setBoardState] = useState<BoardState>({ cells: [] })

  const syncAvailableSessions = (sessions: SessionInfo[]) => {
    setAvailableSessions(sessions.filter((session) => session.canJoin))
  }

  const resetToLobby = () => {
    setSessionId('')
    setPlayers([])
    setIsHost(false)
    setBoardState({ cells: [] })
    setScreenState('lobby')
    fetchAvailableSessions()
  }

  const updateScreenForSessionState = (state: SessionState) => {
    if (state === 'ingame') {
      setScreenState('playing')
      return
    }

    if (state === 'lobby') {
      setScreenState('waiting')
    }
  }

  useEffect(() => {
    sessionIdRef.current = sessionId
  }, [sessionId])

  useEffect(() => {
    // Connect to the server
    const socket = io('http://localhost:3001')
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('Connected to server')
      setIsConnected(true)
      fetchAvailableSessions()
    })

    socket.on('sessions-updated', (sessions: SessionInfo[]) => {
      syncAvailableSessions(sessions)
    })

    socket.on('disconnect', () => {
      console.log('Disconnected from server')
      setIsConnected(false)
      resetToLobby()
      setAvailableSessions([])
    })

    socket.on('player-joined', (data: { players: string[]; state: SessionState }) => {
      console.log('Player joined:', data)
      setPlayers(data.players)
      updateScreenForSessionState(data.state)
    })

    socket.on('player-left', (data: { players: string[]; state: SessionState }) => {
      console.log('Player left:', data)
      setPlayers(data.players)
      updateScreenForSessionState(data.state)
    })

    socket.on('session-finished', (data: { sessionId: string; winnerId: string }) => {
      console.log('Session finished:', data)

      if (data.sessionId !== sessionIdRef.current) {
        return
      }

      if (data.winnerId === socket.id) {
        setScreenState('winner')
        return
      }

      resetToLobby()
    })

    socket.on('game-state', (data: { sessionId: string; gameState: BoardState }) => {
      if (data.sessionId !== sessionIdRef.current) {
        return
      }

      setBoardState(data.gameState)
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

  const fetchAvailableSessions = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/sessions')
      const sessions: SessionInfo[] = await response.json()
      syncAvailableSessions(sessions)
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    }
  }

  const hostGame = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      setSessionId(data.sessionId)
      setIsHost(true)
      setBoardState({ cells: [] })
      setScreenState('waiting')
      socketRef.current?.emit('join-session', data.sessionId)
    } catch (error) {
      console.error('Failed to create session:', error)
    }
  }

  const joinGame = (sessionIdToJoin: string) => {
    setSessionId(sessionIdToJoin)
    setIsHost(false)
    setBoardState({ cells: [] })
    setScreenState('waiting')
    socketRef.current?.emit('join-session', sessionIdToJoin)
  }

  const leaveGame = () => {
    if (sessionId && socketRef.current) {
      socketRef.current.emit('leave-session', sessionId)
      resetToLobby()
    }
  }

  if (screenState === 'playing') {
    return (
      <GameScreen
        sessionId={sessionId}
        players={players}
        isHost={isHost}
        boardState={boardState}
        onPlaceCell={(x, y) => socketRef.current?.emit('place-cell', { sessionId, x, y })}
        onLeave={leaveGame}
      />
    )
  }

  if (screenState === 'winner') {
    return <WinnerScreen onReturnToLobby={resetToLobby} />
  }

  if (screenState === 'waiting') {
    return (
      <div className="w-screen h-screen bg-slate-600 flex flex-col items-center justify-center text-white font-sans">
        <h1 className="mb-10 text-5xl text-center">Infinity Hexagonial<br />Tik-Tak-Toe</h1>
        <WaitingScreen
          sessionId={sessionId}
          playerCount={players.length}
          onCancel={leaveGame}
        />
      </div>
    )
  }

  return (
    <LobbyScreen
      isConnected={isConnected}
      availableSessions={availableSessions}
      onHostGame={hostGame}
      onJoinGame={joinGame}
    />
  )
}

export default App
