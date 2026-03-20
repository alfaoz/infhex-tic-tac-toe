import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import FinishedGamesScreen from '../components/FinishedGamesScreen'
import { useQueryFinishedGames } from '../queryHooks'
import { buildFinishedGamePath, buildFinishedGamesPath, useArchiveRouteState } from './archiveRouteState'

function FinishedGamesRoute() {
  const navigate = useNavigate()
  const archiveRouteState = useArchiveRouteState()
  const finishedGamesQuery = useQueryFinishedGames(
    archiveRouteState?.archivePage ?? 1,
    archiveRouteState?.archiveBaseTimestamp ?? Date.now(),
    { enabled: Boolean(archiveRouteState) }
  )

  useEffect(() => {
    if (!archiveRouteState || !finishedGamesQuery.data) {
      return
    }

    if (archiveRouteState.archivePage > finishedGamesQuery.data.pagination.totalPages) {
      void navigate(
        buildFinishedGamesPath(
          finishedGamesQuery.data.pagination.totalPages,
          archiveRouteState.archiveBaseTimestamp
        ),
        { replace: true }
      )
    }
  }, [archiveRouteState, finishedGamesQuery.data, navigate])

  if (!archiveRouteState) {
    return null
  }

  return (
    <FinishedGamesScreen
      archive={finishedGamesQuery.data ?? null}
      isLoading={finishedGamesQuery.isLoading}
      errorMessage={finishedGamesQuery.error instanceof Error ? finishedGamesQuery.error.message : null}
      onBack={() => void navigate('/')}
      onOpenGame={(gameId) => void navigate(
        buildFinishedGamePath(
          gameId,
          archiveRouteState.archivePage,
          archiveRouteState.archiveBaseTimestamp
        )
      )}
      onChangePage={(nextArchivePage) => void navigate(
        buildFinishedGamesPath(nextArchivePage, archiveRouteState.archiveBaseTimestamp)
      )}
      onRefresh={() => void navigate(buildFinishedGamesPath(1, Date.now()))}
    />
  )
}

export default FinishedGamesRoute
