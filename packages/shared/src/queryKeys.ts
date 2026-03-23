export const FINISHED_GAMES_PAGE_SIZE = 20;
export type FinishedGamesArchiveView = 'all' | 'mine';

export const queryKeys = {
    account: ['account'] as const,
    publicAccount: (profileId: string) => ['account', 'public', profileId] as const,
    accountPreferences: ['account', 'preferences'] as const,
    accountStatistics: ['account', 'statistics'] as const,
    publicAccountStatistics: (profileId: string) => ['account', 'public', profileId, 'statistics'] as const,
    adminServerSettings: ['admin', 'server-settings'] as const,
    adminStats: (timezoneOffsetMinutes: number) => ['admin', 'stats', timezoneOffsetMinutes] as const,
    leaderboard: ['leaderboard'] as const,
    availableSessions: ['sessions', 'available'] as const,
    sandboxPosition: (positionId: string) => ['sandbox-position', positionId] as const,
    finishedGames: ['finished-games'] as const,
    finishedGamesPage: (view: FinishedGamesArchiveView, page: number, pageSize: number, baseTimestamp: number) =>
        ['finished-games', view, page, pageSize, baseTimestamp] as const,
    finishedGame: (gameId: string) => ['finished-games', gameId] as const
};
