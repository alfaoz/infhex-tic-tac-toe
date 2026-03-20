import type { MouseEvent } from 'react'
import type { SessionInfo } from '@ih3t/shared'
import FinishedPlayerScreen from './FinishedPlayerScreen'

type FinishedSessionInfo = Extract<SessionInfo, { state: 'finished' }>

interface LoserScreenProps {
  session: FinishedSessionInfo
  currentPlayerId: string
  onReturnToLobby: () => void
  reviewGameHref?: string
  onReviewGame?: (event: MouseEvent<HTMLAnchorElement>) => void
  onRequestRematch?: () => void
}

function LoserScreen({
  session,
  currentPlayerId,
  onReturnToLobby,
  reviewGameHref,
  onReviewGame,
  onRequestRematch
}: Readonly<LoserScreenProps>) {
  const message = session.finishReason === 'timeout'
    ? 'You failed to place a cell before the timer ran out.'
    : session.finishReason === 'six-in-a-row'
      ? 'The other player completed a six-tile row.'
      : session.finishReason === 'surrender'
        ? 'You surrendered the match.'
        : session.finishReason === 'terminated'
        ? 'The match was closed because the server shutdown reached its deadline.'
        : 'You left the match before it finished.'
  return (
    <FinishedPlayerScreen
      session={session}
      currentPlayerId={currentPlayerId}
      variant="lose"
      title="You Lost"
      message={message}
      onReturnToLobby={onReturnToLobby}
      reviewGameHref={reviewGameHref}
      onReviewGame={onReviewGame}
      onRequestRematch={onRequestRematch}
    />
  )
}

export default LoserScreen
