import { useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'

function parseArchivePage(searchParams: URLSearchParams) {
  const pageValue = searchParams.get('page')
  const page = Number.parseInt(pageValue ?? '', 10)

  if (!Number.isFinite(page) || page < 1) {
    return 1
  }

  return page
}

function parseArchiveBaseTimestamp(searchParams: URLSearchParams) {
  const value = Number.parseInt(searchParams.get('at') ?? '', 10)
  return Number.isFinite(value) && value > 0 ? value : null
}

export function buildFinishedGamesPath(archivePage: number, archiveBaseTimestamp: number) {
  const searchParams = new URLSearchParams()
  searchParams.set('at', String(archiveBaseTimestamp))

  if (archivePage > 1) {
    searchParams.set('page', String(archivePage))
  }

  return `/games?${searchParams.toString()}`
}

export function buildFinishedGamePath(gameId: string, archivePage: number, archiveBaseTimestamp: number) {
  const searchParams = new URLSearchParams()
  searchParams.set('at', String(archiveBaseTimestamp))

  if (archivePage > 1) {
    searchParams.set('page', String(archivePage))
  }

  return `/games/${encodeURIComponent(gameId)}?${searchParams.toString()}`
}

export function buildSessionPath(sessionId: string) {
  return `/session/${encodeURIComponent(sessionId)}`
}

export function useArchiveRouteState() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const archivePage = parseArchivePage(searchParams)
  const archiveBaseTimestamp = parseArchiveBaseTimestamp(searchParams)

  useEffect(() => {
    if (archiveBaseTimestamp) {
      return
    }

    void navigate({
      pathname: location.pathname,
      search: `?${new URLSearchParams({
        at: String(Date.now()),
        ...(archivePage > 1 ? { page: String(archivePage) } : {})
      }).toString()}`
    }, { replace: true })
  }, [archiveBaseTimestamp, archivePage, location.pathname, navigate])

  if (!archiveBaseTimestamp) {
    return null
  }

  return {
    archivePage,
    archiveBaseTimestamp
  }
}
