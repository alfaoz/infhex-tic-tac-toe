import { useEffect, useRef } from 'react'
import type { CreateSessionRequest } from '@ih3t/shared'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import LobbyScreen from '../components/LobbyScreen'
import { hostGame, joinGame } from '../liveGameClient'
import { useLiveGameStore } from '../liveGameStore'
import { useQueryAvailableSessions } from '../queryHooks'
import { buildFinishedGamesPath, buildSessionPath } from './archiveRouteState'

function LobbyRoute() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteSessionId = searchParams.get('join')
  const attemptedSessionIdRef = useRef<string | null>(null)
  const connection = useLiveGameStore(state => state.connection)
  const shutdown = useLiveGameStore(state => state.shutdown)
  const liveScreen = useLiveGameStore(state => state.screen)
  const availableSessionsQuery = useQueryAvailableSessions({ enabled: true })

  useEffect(() => {
    attemptedSessionIdRef.current = null
  }, [inviteSessionId])

  useEffect(() => {
    if (connection.isConnected) {
      return
    }

    attemptedSessionIdRef.current = null
  }, [connection.isConnected])

  useEffect(() => {
    if (!inviteSessionId || !connection.isConnected || liveScreen.kind !== 'none') {
      return
    }

    if (attemptedSessionIdRef.current === inviteSessionId) {
      return
    }

    attemptedSessionIdRef.current = inviteSessionId
    joinGame(inviteSessionId)
  }, [connection.isConnected, inviteSessionId, liveScreen.kind])

  const createLobby = (request: CreateSessionRequest) => {
    void (async () => {
      const sessionId = await hostGame(request)
      if (!sessionId) {
        return
      }

      void navigate(buildSessionPath(sessionId))
    })()
  }

  const joinLiveGame = (sessionId: string) => {
    void navigate(buildSessionPath(sessionId))
  }

  if (liveScreen.kind !== 'none') {
    return <Navigate to={buildSessionPath(liveScreen.sessionId)} replace />
  }

  return (
    <LobbyScreen
      isConnected={connection.isConnected}
      shutdown={shutdown}
      liveSessions={availableSessionsQuery.data ?? []}
      onHostGame={createLobby}
      onJoinGame={joinLiveGame}
      onViewFinishedGames={() => void navigate(buildFinishedGamesPath(1, Date.now()))}
    />
  )
}

export default LobbyRoute
