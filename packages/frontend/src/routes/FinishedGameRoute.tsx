import { Navigate, useParams } from 'react-router'
import FinishedGameReviewScreen from '../components/FinishedGameReviewScreen'
import { useQueryAccount, useQueryAccountPreferences } from '../query/accountClient'
import { useQueryFinishedGame } from '../query/finishedGamesClient'

function FinishedGameRoute() {
  const { gameId } = useParams<{ gameId: string }>()
  const accountQuery = useQueryAccount({ enabled: Boolean(gameId) })
  const accountPreferencesQuery = useQueryAccountPreferences({
    enabled: Boolean(accountQuery.data?.user)
  })
  const finishedGameQuery = useQueryFinishedGame(gameId ?? null, {
    enabled: Boolean(gameId)
  })

  if (!gameId) {
    return <Navigate to="/" replace />
  }

  return (
    <FinishedGameReviewScreen
      game={finishedGameQuery.data ?? null}
      isLoading={finishedGameQuery.isLoading}
      errorMessage={finishedGameQuery.error instanceof Error ? finishedGameQuery.error.message : null}
      showTilePieceMarkers={accountPreferencesQuery.data?.preferences.tilePieceMarkers ?? false}
      onRetry={() => void finishedGameQuery.refetch()}
    />
  )
}

export default FinishedGameRoute
