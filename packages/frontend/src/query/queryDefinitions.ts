import {
  FINISHED_GAMES_PAGE_SIZE,
  queryKeys,
  type FinishedGamesArchiveView,
  type LobbyInfo
} from '@ih3t/shared'

export function sortLobbySessions(sessions: LobbyInfo[]) {
  return [...sessions].sort((leftSession, rightSession) => {
    const leftCanJoin = leftSession.startedAt === null && leftSession.playerNames.length < 2
    const rightCanJoin = rightSession.startedAt === null && rightSession.playerNames.length < 2

    if (leftCanJoin !== rightCanJoin) {
      return leftCanJoin ? -1 : 1
    }

    return (rightSession.startedAt ?? 0) - (leftSession.startedAt ?? 0)
  })
}

export {
  FINISHED_GAMES_PAGE_SIZE,
  queryKeys
}

export type { FinishedGamesArchiveView }
