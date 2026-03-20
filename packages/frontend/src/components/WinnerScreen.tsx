import type { MouseEvent } from 'react'
import type { SessionInfo } from '@ih3t/shared'
import FinishedPlayerScreen from './FinishedPlayerScreen'

type FinishedSessionInfo = Extract<SessionInfo, { state: 'finished' }>

interface WinnerScreenProps {
  session: FinishedSessionInfo
  currentPlayerId: string
  onReturnToLobby: () => void
  reviewGameHref?: string
  onReviewGame?: (event: MouseEvent<HTMLAnchorElement>) => void
  onRequestRematch?: () => void
}

function WinnerScreen({
  session,
  currentPlayerId,
  onReturnToLobby,
  reviewGameHref,
  onReviewGame,
  onRequestRematch
}: Readonly<WinnerScreenProps>) {
  const message = session.finishReason === 'timeout'
    ? 'The other player failed to place a cell before the timer ran out.'
    : session.finishReason === 'six-in-a-row'
      ? 'You completed a six-tile row.'
      : session.finishReason === 'surrender'
        ? 'The other player surrendered.'
        : session.finishReason === 'terminated'
        ? 'The match was closed because the server shutdown reached its deadline.'
        : 'The other player disconnected.'

  return (
    <FinishedPlayerScreen
      session={session}
      currentPlayerId={currentPlayerId}
      variant="win"
      title="You've Won"
      message={message}
      onReturnToLobby={onReturnToLobby}
      reviewGameHref={reviewGameHref}
      onReviewGame={onReviewGame}
      onRequestRematch={onRequestRematch}
    />
  )
}

export default WinnerScreen
