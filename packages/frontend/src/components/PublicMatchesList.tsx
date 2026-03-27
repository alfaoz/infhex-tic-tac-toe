import type { AccountProfile, LobbyInfo } from '@ih3t/shared'
import { formatTimeControl } from '../utils/gameTimeControl'
import { formatLobbyLiveDuration } from '../utils/lobby'

interface PublicMatchesListProps {
    liveSessions: LobbyInfo[]
    now: number
    isConnected: boolean
    account: AccountProfile | null
    isAccountLoading: boolean
    onJoinGame: (sessionId: string) => void
}

function ClockBadgeIcon() {
    return (
        <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4 fill-none stroke-current">
            <circle cx="8" cy="8" r="5.25" strokeWidth="1.5" />
            <path d="M8 5.2v3.2l2.1 1.25" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}


function ModeBadgeIcon({ rated }: Readonly<{ rated: boolean }>) {
    return rated ? (
        <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5 fill-current">
            <path d="M8 1.9l1.7 3.46 3.82.56-2.76 2.69.65 3.8L8 10.59 4.6 12.4l.65-3.8L2.5 5.92l3.8-.56L8 1.9Z" />
        </svg>
    ) : (
        <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current">
            <circle cx="8" cy="8" r="4.75" strokeWidth="1.5" />
            <path d="M5 8h6" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    )
}

function SessionStateIcon({ startedAt }: Readonly<{ startedAt: number | null }>) {
    return startedAt ? (
        <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4 fill-none stroke-current">
            <circle cx="8" cy="8" r="5.25" strokeWidth="1.5" />
            <path d="M6.2 5.3 10.6 8l-4.4 2.7V5.3Z" fill="currentColor" stroke="none" />
        </svg>
    ) : (
        <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4 fill-none stroke-current">
            <path d="M5.2 2.75h5.6" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M5.2 13.25h5.6" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M6.2 3.2v2.15c0 .62.25 1.22.7 1.66L8 8.1l1.1-1.09c.45-.44.7-1.04.7-1.66V3.2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9.8 12.8V10.65c0-.62-.25-1.22-.7-1.66L8 7.9 6.9 8.99c-.45.44-.7 1.04-.7 1.66v2.15" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function canJoinSession(session: LobbyInfo) {
    return session.startedAt === null && session.players.length < 2
}

function isJoinBlockedForGuest(session: LobbyInfo, account: AccountProfile | null) {
    return session.rated && !account
}

function isJoinBlockedForOwnRatedSeat(session: LobbyInfo, account: AccountProfile | null) {
    return session.rated
        && canJoinSession(session)
        && Boolean(account?.id)
        && session.players.some((player) => player.profileId === account?.id)
}

function getJoinButtonLabel(session: LobbyInfo, account: AccountProfile | null, isAccountLoading: boolean) {
    if (isJoinBlockedForGuest(session, account)) {
        return isAccountLoading ? 'Checking Account' : 'Sign In Required'
    }

    if (isJoinBlockedForOwnRatedSeat(session, account)) {
        return 'Already Joined'
    }

    return canJoinSession(session) ? 'Join Lobby' : 'Spectate'
}

function isJoinButtonDisabled(session: LobbyInfo, isConnected: boolean, account: AccountProfile | null) {
    return !isConnected || isJoinBlockedForGuest(session, account) || isJoinBlockedForOwnRatedSeat(session, account)
}

function formatPlayerLabel(player: LobbyInfo['players'][number] | undefined, rated: boolean) {
    if (!player) {
        return null
    }

    return rated ? `${player.displayName} (${player.elo})` : player.displayName
}

function PlayerMatchup({ session }: { session: LobbyInfo }) {
    const [playerOne, playerTwo] = session.players;
    if (!playerOne) {
        return (
            <div className="text-xl font-bold text-white sm:text-2xl">
                Waiting for players
            </div>
        )
    } else if (!playerTwo) {
        return (
            <div className="text-xl font-bold text-white sm:text-2xl">
                {formatPlayerLabel(playerOne, session.rated)}
            </div>
        )
    } else {
        return (
            <div className="text-xl font-bold text-white sm:text-2xl w-full min-w-0 gap-2 flex flex-row justify-between">
                <span className={"flex-1 min-w-0 whitespace-nowrap overscroll-contain overflow-hidden text-ellipsis"}>
                    {formatPlayerLabel(playerOne, session.rated)}
                </span>
                <span className="whitespace-nowrap">vs</span>
                <span className={"flex-1 min-w-0 whitespace-nowrap overscroll-contain overflow-hidden text-ellipsis text-right"}>
                    {formatPlayerLabel(playerTwo, session.rated)}
                </span>
            </div>
        )
    }
}

export default function PublicMatchesList({
    liveSessions,
    now,
    isConnected,
    account,
    isAccountLoading,
    onJoinGame,
}: Readonly<PublicMatchesListProps>) {
    return (
        <section className="w-full max-w-xl rounded-4xl border border-white/10 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.45)] backdrop-blur sm:flex sm:flex-col sm:min-h-136 lg:h-180 sm:bg-slate-950/55 md:p-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-sky-200/80">Live Sessions</p>
                    <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Public Matches</h2>
                </div>
                <div className="rounded-2xl bg-white/5 px-3 py-2 text-right sm:px-4 sm:py-3">
                    <div className="text-2xl font-bold text-white">{liveSessions.length}</div>
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-300">Live Now</div>
                </div>
            </div>

            <div className="mt-5 sm:mt-6 min-h-0 sm:flex-1 sm:overflow-y-auto sm:overscroll-contain sm:pr-1 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
                {liveSessions.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 px-6 py-10 text-center text-slate-300">
                        <p className="text-lg font-semibold text-white">No live sessions are available right now.</p>
                        <p className="mt-2 text-sm leading-6 text-slate-400">Create a new match and the lobby list will update for everyone automatically.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {liveSessions.map((session) => {
                            const canJoin = canJoinSession(session)
                            const joinDisabled = isJoinButtonDisabled(session, isConnected, account)
                            const joinButtonLabel = getJoinButtonLabel(session, account, isAccountLoading)
                            return (
                                <div
                                    key={session.id}
                                    className="flex flex-col flex-wrap gap-3 rounded-3xl border border-white/10 bg-white/6 p-4 shadow-lg sm:rounded-3xl sm:p-5"
                                >
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${canJoin
                                            ? 'bg-emerald-400/15 text-emerald-200'
                                            : 'bg-sky-400/15 text-sky-200'
                                            }`}>
                                            {canJoin ? 'Lobby' : 'Game'} {session.id}
                                        </span>
                                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${session.rated
                                            ? 'bg-amber-300/15 text-amber-100'
                                            : 'bg-white/8 text-slate-200'
                                            }`}>
                                            <ModeBadgeIcon rated={session.rated} />
                                            {session.rated ? 'Rated' : 'Unrated'}
                                        </span>
                                    </div>
                                    <PlayerMatchup session={session} />
                                    <div className="flex sm:flex-row gap-4 flex-col sm:items-center justify-between">
                                        <div className="min-w-0 flex flex-col">
                                            <span className="inline-flex items-center gap-1.5 text-sm text-slate-400">
                                                <ClockBadgeIcon />
                                                {formatTimeControl(session.timeControl)}
                                            </span>
                                            <div className="inline-flex items-center gap-1.5 text-sm text-slate-400">
                                                <SessionStateIcon startedAt={session.startedAt} />
                                                {session.startedAt ? `In game for ${formatLobbyLiveDuration(session.startedAt, now)}` : `Waiting for ${formatLobbyLiveDuration(session.createdAt, now)}`}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => onJoinGame(session.id)}
                                            disabled={joinDisabled}
                                            className={`sm:w-[15em] rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] transition lg:shrink-0 ${joinDisabled
                                                ? 'cursor-not-allowed bg-slate-500/60 text-slate-200'
                                                : canJoin
                                                    ? 'cursor-pointer bg-sky-400 text-slate-950 shadow-[0_10px_30px_rgba(56,189,248,0.28)] hover:-translate-y-0.5 hover:bg-sky-300'
                                                    : 'cursor-pointer border border-white/15 bg-white/8 text-white hover:-translate-y-0.5 hover:bg-white/14'
                                                }`}
                                        >
                                            {joinButtonLabel}
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </section>
    )
}
