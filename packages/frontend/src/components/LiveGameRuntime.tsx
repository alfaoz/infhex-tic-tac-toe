import { useEffect, useRef } from 'react'
import { startLiveGameClient, stopLiveGameClient } from '../liveGameClient'
import { useLiveGameStore } from '../liveGameStore'
import { playMatchStartSound } from '../soundEffects'

function LiveGameRuntime() {
  const liveScreen = useLiveGameStore(state => state.screen)
  const currentPlayerId = useLiveGameStore(state => state.connection.currentPlayerId)
  const previousSessionStateRef = useRef(
    liveScreen.kind === 'session' ? liveScreen.session.state : 'none'
  )

  useEffect(() => {
    startLiveGameClient()

    return () => {
      stopLiveGameClient()
    }
  }, [])

  useEffect(() => {
    const previousState = previousSessionStateRef.current
    const nextState = liveScreen.kind === 'session' ? liveScreen.session.state : 'none'
    const isPlayer = liveScreen.kind === 'session'
      && liveScreen.session.players.some(player => player.id === currentPlayerId)

    if (previousState === 'lobby' && nextState === 'in-game' && isPlayer) {
      playMatchStartSound()
    }

    previousSessionStateRef.current = nextState
  }, [currentPlayerId, liveScreen])

  return null
}

export default LiveGameRuntime
