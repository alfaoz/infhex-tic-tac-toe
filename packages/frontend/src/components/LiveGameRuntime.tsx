import { useEffect, useRef } from 'react'
import { startLiveGameClient, stopLiveGameClient } from '../liveGameClient'
import { useLiveGameStore } from '../liveGameStore'
import { playMatchStartSound } from '../soundEffects'

function LiveGameRuntime() {
  const liveScreen = useLiveGameStore(state => state.screen)
  const previousLiveScreenKindRef = useRef(liveScreen.kind)

  useEffect(() => {
    startLiveGameClient()

    return () => {
      stopLiveGameClient()
    }
  }, [])

  useEffect(() => {
    const previousKind = previousLiveScreenKindRef.current
    if (previousKind === 'waiting' && liveScreen.kind === 'playing' && liveScreen.participantRole === 'player') {
      playMatchStartSound()
    }

    previousLiveScreenKindRef.current = liveScreen.kind
  }, [liveScreen])

  return null
}

export default LiveGameRuntime
