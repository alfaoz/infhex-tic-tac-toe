import type {
    CreateSessionResponse,
    PlayerNames,
    PlayerProfileIds,
    SessionFinishReason,
    SessionInfo,
    ShutdownState
} from '@ih3t/shared';
import type { Logger } from 'pino';
import { inject, injectable } from 'tsyringe';
import { BackgroundWorkerHub } from '../background/backgroundWorkers';
import { ROOT_LOGGER } from '../logger';
import {
    GameHistoryRepository,
    type CreateGameHistoryPayload,
} from '../persistence/gameHistoryRepository';
import { GameSimulation, SimulationError } from '../simulation/gameSimulation';
import type {
    CreateSessionParams,
    JoinSessionParams,
    JoinSessionResult,
    ParticipantJoinedEvent,
    ParticipantLeftEvent,
    PlayerLeaveSource,
    RematchRequestResult,
    RematchSessionResult,
    SessionManagerEventHandlers,
    SessionUpdatedEvent,
    StoredGameSession,
} from './types';
import {
    buildSessionParticipant,
    cloneGameBoard,
    cloneGameOptions,
    cloneParticipants,
    createStoredGameSession,
} from './types';

export class SessionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SessionError';
    }
}

export interface TerminalSessionStatus {
    sessionId: string;
    state: 'lobby' | 'in-game' | 'finished';
    playerCount: number;
    spectatorCount: number;
    moveCount: number;
    createdAt: number;
    startedAt: number | null;
    gameDurationMs: number | null;
    totalLifetimeMs: number;
    currentTurnPlayerId: string | null;
    placementsRemaining: number;
}

const DEFAULT_SHUTDOWN_DELAY_MS = 10 * 60 * 1000;
const MAX_PLAYERS_PER_SESSION = 2;
type ShutdownTrigger = 'all-sessions-finished' | 'deadline-reached';

@injectable()
export class SessionManager {
    private eventHandlers: SessionManagerEventHandlers = {};
    private readonly logger: Logger;
    private readonly sessions = new Map<string, StoredGameSession>();
    private scheduledShutdown: ShutdownState | null = null;
    private scheduledShutdownTimer: ReturnType<typeof setTimeout> | null = null;
    private shutdownRequested = false;
    private shutdownHandler: (() => void) | null = null;

    constructor(
        @inject(ROOT_LOGGER) rootLogger: Logger,
        @inject(GameSimulation) private readonly simulation: GameSimulation,
        @inject(GameHistoryRepository) private readonly gameHistoryRepository: GameHistoryRepository,
        @inject(BackgroundWorkerHub) private readonly backgroundWorkers: BackgroundWorkerHub
    ) {
        this.logger = rootLogger.child({ component: 'session-manager' });
    }

    setEventHandlers(eventHandlers: SessionManagerEventHandlers): void {
        this.eventHandlers = eventHandlers;
    }

    setShutdownHandler(handler: () => void): void {
        this.shutdownHandler = handler;
    }

    listSessions(): SessionInfo[] {
        return this.listStoredSessions()
            .filter((session) => {
                if (session.state === 'finished') {
                    return false;
                }

                return session.state !== 'lobby' || session.gameOptions.visibility === 'public';
            })
            .map((session) => this.toSessionInfo(session));
    }

    getSessionInfo(sessionId: string): SessionInfo | null {
        const session = this.sessions.get(sessionId);
        return session ? this.toSessionInfo(session) : null;
    }

    getTerminalSessionStatuses(now = Date.now()): TerminalSessionStatus[] {
        return this.listStoredSessions().map((session) => ({
            sessionId: session.id,
            state: session.state,
            playerCount: session.players.length,
            spectatorCount: session.spectators.length,
            moveCount: session.moveHistory.length,
            createdAt: session.createdAt,
            startedAt: session.startedAt,
            gameDurationMs: session.startedAt === null ? null : Math.max(0, now - session.startedAt),
            totalLifetimeMs: Math.max(0, now - session.createdAt),
            currentTurnPlayerId: session.boardState.currentTurnPlayerId,
            placementsRemaining: session.boardState.placementsRemaining
        }));
    }

    getShutdownState(): ShutdownState | null {
        if (!this.scheduledShutdown) {
            return null;
        }

        return { ...this.scheduledShutdown };
    }

    scheduleShutdown(delayMs = DEFAULT_SHUTDOWN_DELAY_MS): ShutdownState {
        if (this.scheduledShutdown) {
            return { ...this.scheduledShutdown };
        }

        const scheduledAt = Date.now();
        this.scheduledShutdown = {
            scheduledAt,
            shutdownAt: scheduledAt + delayMs
        };
        this.shutdownRequested = false;

        this.clearScheduledShutdownTimer();
        this.scheduledShutdownTimer = setTimeout(() => {
            this.handleScheduledShutdownDeadline();
        }, delayMs);

        this.emitShutdownUpdated();
        this.logger.info({
            event: 'shutdown.scheduled',
            scheduledAt,
            shutdownAt: this.scheduledShutdown.shutdownAt,
            activeSessionCount: this.sessions.size
        }, 'Scheduled server shutdown');

        if (this.sessions.size === 0) {
            setTimeout(() => {
                this.requestApplicationShutdown('all-sessions-finished');
            }, 0);
        }

        return { ...this.scheduledShutdown };
    }

    createSession(params: CreateSessionParams): CreateSessionResponse {
        if (this.scheduledShutdown) {
            throw new SessionError('Server shutdown is scheduled. New games cannot be created.');
        }

        const sessionId = this.createSessionId();
        const session = createStoredGameSession(sessionId, params.lobbyOptions);

        this.sessions.set(session.id, session);
        this.emitSessionsUpdated();
        void this.gameHistoryRepository.createHistory(this.getCreateHistoryPayload(session));

        this.backgroundWorkers.track('game-created', {
            sessionId,
            createdAt: new Date(session.createdAt).toISOString(),
            client: params.client
        });

        return { sessionId };
    }

    joinSession(params: JoinSessionParams): JoinSessionResult {
        const session = this.requireSession(params.sessionId);

        if (params.participantId) {
            const existingRole = this.getExistingParticipantRole(session, params.participantId);
            if (existingRole) {
                this.refreshParticipant(session, params.participantId, params.user);
                const sessionInfo = this.toSessionInfo(session);
                return {
                    sessionId: session.id,
                    participantId: params.participantId,
                    role: existingRole,
                    session: sessionInfo,
                    isNewParticipant: false,
                    gameState: session.state !== 'lobby'
                        ? this.simulation.getPublicGameState(session)
                        : undefined
                };
            }
        }

        if (session.state === 'finished') {
            throw new SessionError('Session has already finished');
        }

        const participantId = params.participantId ?? this.createParticipantId(session);
        const participant = buildSessionParticipant(participantId, params.user);

        let role: JoinSessionResult['role'];
        if (session.state === 'lobby') {
            if (session.players.length >= MAX_PLAYERS_PER_SESSION) {
                throw new SessionError('Session is full');
            }

            session.players.push(participant);
            role = 'player';
        } else {
            session.spectators.push(participant);
            role = 'spectator';
        }

        const sessionInfo = this.toSessionInfo(session);
        this.emitSessionsUpdated();
        this.emitSessionUpdated(session);
        this.backgroundWorkers.track(role === 'player' ? 'game-joined' : 'spectator-joined', {
            sessionId: session.id,
            [`${role}Id`]: participant.id,
            players: session.players.map(({ id }) => id),
            spectators: session.spectators.map(({ id }) => id),
            client: params.client
        });

        const event: ParticipantJoinedEvent = {
            sessionId: session.id,
            participantId: participant.id,
            participantRole: role,
            session: sessionInfo
        };
        this.eventHandlers.participantJoined?.(event);

        return {
            sessionId: session.id,
            participantId: participant.id,
            role,
            session: sessionInfo,
            isNewParticipant: true,
            gameState: role === 'spectator' ? this.simulation.getPublicGameState(session) : undefined
        };
    }

    activateSession(sessionId: string): void {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return;
        }

        this.reconcileLobbyState(session);
    }

    leaveSession(sessionId: string, participantId: string, source: PlayerLeaveSource): void {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return;
        }

        if (session.players.some((participant) => participant.id === participantId)) {
            this.removePlayerFromSession(session, participantId, source);
            return;
        }

        if (session.spectators.some((participant) => participant.id === participantId)) {
            this.removeSpectatorFromSession(session, participantId, source);
        }
    }

    surrenderSession(sessionId: string, participantId: string): void {
        const session = this.requireSession(sessionId);
        if (session.state !== 'in-game') {
            throw new SessionError('Game is not currently active');
        }

        if (!session.players.some((participant) => participant.id === participantId)) {
            throw new SessionError('Only active players can surrender');
        }

        const winningPlayerId = session.players.find((player) => player.id !== participantId)?.id ?? null;
        this.finishSession(session, 'surrender', winningPlayerId);
    }

    handleDisconnect(participantId: string, terminal: boolean): void {
        for (const session of this.findSessionsByParticipant(participantId)) {
            if (session.state === 'in-game' && !terminal) {
                continue;
            }

            if (session.players.some((participant) => participant.id === participantId)) {
                this.removePlayerFromSession(session, participantId, 'disconnect');
                continue;
            }

            if (session.spectators.some((participant) => participant.id === participantId)) {
                this.removeSpectatorFromSession(session, participantId, 'disconnect');
            }
        }
    }

    placeCell(sessionId: string, participantId: string, x: number, y: number): void {
        const session = this.requireSession(sessionId);
        if (session.state !== 'in-game') {
            throw new SessionError('Game is not currently active');
        }

        if (!session.players.some((participant) => participant.id === participantId)) {
            throw new SessionError('You are not part of this session');
        }

        let moveResult;
        try {
            moveResult = this.simulation.applyMove(session, {
                playerId: participantId,
                x,
                y
            });
        } catch (error: unknown) {
            if (error instanceof SimulationError) {
                throw new SessionError(error.message);
            }

            throw error;
        }

        void this.gameHistoryRepository.appendMove(session.currentGameId, moveResult.move);

        if (moveResult.winningPlayerId) {
            this.emitGameState(session);
            this.finishSession(session, 'six-in-a-row', moveResult.winningPlayerId);
            return;
        }

        this.simulation.syncTurnTimeout(session, this.handleTurnExpired);
        this.emitGameState(session);
    }

    requestRematch(sessionId: string, participantId: string): RematchRequestResult {
        if (this.scheduledShutdown) {
            throw new SessionError('Server shutdown is scheduled. Rematches are unavailable.');
        }

        const session = this.requireSession(sessionId);
        if (session.state !== 'finished') {
            throw new SessionError('Rematch is not available for this match.');
        }

        if (!session.players.some((player) => player.id === participantId)) {
            throw new SessionError('Rematch is not available for this match.');
        }

        if (session.players.length !== MAX_PLAYERS_PER_SESSION) {
            throw new SessionError('Your opponent is no longer available for a rematch.');
        }

        if (!session.rematchAcceptedPlayerIds.includes(participantId)) {
            session.rematchAcceptedPlayerIds = [...session.rematchAcceptedPlayerIds, participantId];
        }
        this.emitSessionUpdated(session);

        return {
            status: session.rematchAcceptedPlayerIds.length === session.players.length ? 'ready' : 'pending',
            players: session.players.map(({ id }) => id)
        };
    }

    createRematchSession(finishedSessionId: string, spectatorIds: string[] = []): RematchSessionResult {
        if (this.scheduledShutdown) {
            throw new SessionError('Server shutdown is scheduled. Rematches are unavailable.');
        }

        const session = this.requireSession(finishedSessionId);
        if (session.state !== 'finished') {
            throw new SessionError('Rematch is not available for this match.');
        }

        if (session.rematchAcceptedPlayerIds.length < session.players.length) {
            throw new SessionError('Waiting for both players to request the rematch.');
        }

        const nextSession = createStoredGameSession(finishedSessionId, session.gameOptions);
        nextSession.players = cloneParticipants(session.players).reverse();
        nextSession.spectators = session.spectators
            .filter((spectator) => spectatorIds.includes(spectator.id))
            .map((spectator) => ({ ...spectator }));

        this.sessions.delete(session.id);
        this.sessions.set(nextSession.id, nextSession);
        this.emitSessionsUpdated();
        void this.gameHistoryRepository.createHistory(this.getCreateHistoryPayload(nextSession));

        return {
            sessionId: nextSession.id,
            session: this.toSessionInfo(nextSession)
        };
    }

    cancelRematch(sessionId: string, participantId?: string): void {
        const session = this.sessions.get(sessionId);
        if (!session || session.state !== 'finished') {
            return;
        }

        if (participantId) {
            if (!session.rematchAcceptedPlayerIds.includes(participantId)) {
                return;
            }

            session.rematchAcceptedPlayerIds = [];
            this.emitSessionUpdated(session);
            return;
        }

        session.rematchAcceptedPlayerIds = [];
        this.emitSessionUpdated(session);
    }

    expireStaleRematches(_maxAgeMs: number): void {
        /* rematches now live on the finished session itself */
    }

    private readonly handleTurnExpired = (sessionId: string): void => {
        const session = this.sessions.get(sessionId);
        if (!session || session.state !== 'in-game' || session.players.length < MAX_PLAYERS_PER_SESSION) {
            this.simulation.clearSession(sessionId);
            return;
        }

        const timedOutPlayerId = session.boardState.currentTurnPlayerId;
        if (!timedOutPlayerId) {
            this.simulation.clearSession(sessionId);
            return;
        }

        const winningPlayerId = session.players.find((player) => player.id !== timedOutPlayerId)?.id ?? null;
        this.finishSession(session, 'timeout', winningPlayerId);
    };

    private handleScheduledShutdownDeadline(): void {
        const shutdown = this.scheduledShutdown;
        if (!shutdown) {
            return;
        }

        this.clearScheduledShutdownTimer();
        this.logger.info({
            event: 'shutdown.deadline-reached',
            shutdownAt: shutdown.shutdownAt,
            activeSessionCount: this.sessions.size
        }, 'Shutdown deadline reached; closing remaining sessions');

        for (const session of [...this.listStoredSessions()]) {
            this.finishSession(session, 'terminated', null);
        }

        this.requestApplicationShutdown('deadline-reached');
    }

    private reconcileLobbyState(session: StoredGameSession): void {
        if (session.players.length === 0) {
            this.logger.info({
                event: 'session.terminated-empty',
                sessionId: session.id
            }, 'Removing empty session');
            this.simulation.clearSession(session.id);
            this.sessions.delete(session.id);
            this.emitSessionsUpdated();
            return;
        }

        if (session.state !== 'lobby' || session.players.length < MAX_PLAYERS_PER_SESSION) {
            return;
        }

        session.state = 'in-game';
        session.startedAt = Date.now();
        session.finishReason = null;
        session.winningPlayerId = null;
        session.rematchAcceptedPlayerIds = [];
        this.simulation.startSession(session, this.handleTurnExpired, session.startedAt);
        void this.gameHistoryRepository.markStarted(
            session.currentGameId,
            session.players.map(({ id }) => id),
            this.buildPlayerNames(session),
            this.buildPlayerProfileIds(session)
        );

        this.emitGameState(session);
        this.emitSessionsUpdated();
        this.emitSessionUpdated(session);
        this.logger.info({
            event: 'session.started',
            sessionId: session.id,
            players: session.players.map(({ id }) => id),
            startedAt: session.startedAt
        }, 'Session started');
    }

    private finishSession(session: StoredGameSession, reason: SessionFinishReason, winningPlayerId: string | null): void {
        if (session.state === 'finished') {
            return;
        }

        const finishedAt = Date.now();
        session.state = 'finished';
        session.boardState = cloneGameBoard(this.simulation.getPublicGameState(session).gameState);
        session.finishReason = reason;
        session.winningPlayerId = winningPlayerId;
        session.rematchAcceptedPlayerIds = [];

        const gameDurationMs = session.startedAt === null ? null : finishedAt - session.startedAt;

        void this.gameHistoryRepository.finalizeHistory({
            id: session.currentGameId,
            startedAt: session.startedAt,
            winningPlayerId,
            reason,
        });

        this.backgroundWorkers.track('game-finished', {
            sessionId: session.id,
            reason,
            winningPlayerId,
            players: session.players.map(({ id }) => id),
            spectators: session.spectators.map(({ id }) => id),
            boardState: session.boardState,
            createdAt: new Date(session.createdAt).toISOString(),
            startedAt: session.startedAt === null ? null : new Date(session.startedAt).toISOString(),
            finishedAt: new Date(finishedAt).toISOString(),
            gameDurationMs,
            totalLifetimeMs: finishedAt - session.createdAt
        });

        this.simulation.clearSession(session.id);
        this.emitSessionsUpdated();
        this.emitSessionUpdated(session);
        this.maybeShutdownAfterSessionFinished();
        this.logger.info({
            event: 'session.finished',
            sessionId: session.id,
            reason,
            winningPlayerId,
            players: session.players.map(({ id }) => id),
            finishedAt
        }, 'Session finished');
    }

    private removePlayerFromSession(session: StoredGameSession, participantId: string, source: PlayerLeaveSource): void {
        session.players = session.players.filter((player) => player.id !== participantId);

        this.backgroundWorkers.track('game-left', {
            sessionId: session.id,
            playerId: participantId,
            source,
            sessionState: session.state,
            remainingPlayers: session.players.map(({ id }) => id)
        });

        if (session.state === 'in-game') {
            const winningPlayerId = session.players[0]?.id ?? null;
            this.finishSession(session, 'disconnect', winningPlayerId);
            return;
        }

        session.rematchAcceptedPlayerIds = [];
        const sessionInfo = this.toSessionInfo(session);
        const event: ParticipantLeftEvent = {
            sessionId: session.id,
            participantId,
            participantRole: 'player',
            session: sessionInfo
        };
        this.eventHandlers.participantLeft?.(event);

        if (session.players.length === 0 && session.spectators.length === 0) {
            this.sessions.delete(session.id);
        }

        this.emitSessionsUpdated();
        if (this.sessions.has(session.id)) {
            this.emitSessionUpdated(session);
        }
        this.reconcileLobbyState(session);
    }

    private removeSpectatorFromSession(session: StoredGameSession, participantId: string, source: PlayerLeaveSource): void {
        session.spectators = session.spectators.filter((spectator) => spectator.id !== participantId);

        this.backgroundWorkers.track('spectator-left', {
            sessionId: session.id,
            spectatorId: participantId,
            source,
            sessionState: session.state,
            remainingSpectators: session.spectators.map(({ id }) => id)
        });

        const sessionInfo = this.toSessionInfo(session);
        const event: ParticipantLeftEvent = {
            sessionId: session.id,
            participantId,
            participantRole: 'spectator',
            session: sessionInfo
        };
        this.eventHandlers.participantLeft?.(event);

        if (session.players.length === 0 && session.spectators.length === 0) {
            this.sessions.delete(session.id);
            this.emitSessionsUpdated();
            return;
        }

        this.emitSessionUpdated(session);
    }

    private emitSessionsUpdated(): void {
        this.eventHandlers.sessionsUpdated?.(this.listSessions());
    }

    private emitShutdownUpdated(): void {
        this.eventHandlers.shutdownUpdated?.(this.getShutdownState());
    }

    private emitSessionUpdated(session: StoredGameSession): void {
        const event: SessionUpdatedEvent = {
            sessionId: session.id,
            session: this.toSessionInfo(session)
        };
        this.eventHandlers.sessionUpdated?.(event);
    }

    private emitGameState(session: StoredGameSession): void {
        this.eventHandlers.gameStateUpdated?.(this.simulation.getPublicGameState(session));
    }

    private requireSession(sessionId: string): StoredGameSession {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new SessionError('Session not found');
        }

        return session;
    }

    private getExistingParticipantRole(session: StoredGameSession, participantId: string): JoinSessionResult['role'] | null {
        if (session.players.some((participant) => participant.id === participantId)) {
            return 'player';
        }

        if (session.spectators.some((participant) => participant.id === participantId)) {
            return 'spectator';
        }

        return null;
    }

    private refreshParticipant(session: StoredGameSession, participantId: string, user: JoinSessionParams['user']): void {
        const nextParticipant = buildSessionParticipant(participantId, user);
        session.players = session.players.map((participant) =>
            participant.id === participantId ? nextParticipant : participant
        );
        session.spectators = session.spectators.map((participant) =>
            participant.id === participantId ? nextParticipant : participant
        );
    }

    private createSessionId(): string {
        let sessionId = Math.random().toString(36).substring(2, 8);
        while (this.sessions.has(sessionId)) {
            sessionId = Math.random().toString(36).substring(2, 8);
        }

        return sessionId;
    }

    private createParticipantId(session: StoredGameSession): string {
        let participantId = Math.random().toString(36).substring(2, 8);
        while (
            session.players.some((participant) => participant.id === participantId)
            || session.spectators.some((participant) => participant.id === participantId)
        ) {
            participantId = Math.random().toString(36).substring(2, 8);
        }

        return participantId;
    }

    private toSessionInfo(session: StoredGameSession): SessionInfo {
        const base = {
            id: session.id,
            players: cloneParticipants(session.players),
            spectators: cloneParticipants(session.spectators),
            gameOptions: cloneGameOptions(session.gameOptions),
        };

        switch (session.state) {
            case 'lobby':
                return {
                    ...base,
                    state: 'lobby'
                };

            case 'in-game':
                return {
                    ...base,
                    state: 'in-game',
                    startedAt: session.startedAt ?? session.createdAt,
                    gameId: session.currentGameId
                };

            case 'finished':
                return {
                    ...base,
                    state: 'finished',
                    gameId: session.currentGameId,
                    finishReason: session.finishReason ?? 'terminated',
                    winningPlayerId: session.winningPlayerId,
                    rematchAcceptedPlayerIds: [...session.rematchAcceptedPlayerIds]
                };
        }
    }

    private buildPlayerNames(session: StoredGameSession): PlayerNames {
        const playerNames: PlayerNames = {};

        for (const [playerIndex, player] of session.players.entries()) {
            playerNames[player.id] = player.displayName || `Player ${playerIndex + 1}`;
        }

        return playerNames;
    }

    private buildPlayerProfileIds(session: StoredGameSession): PlayerProfileIds {
        const playerProfileIds: PlayerProfileIds = {};

        for (const player of session.players) {
            playerProfileIds[player.id] = player.profileId;
        }

        return playerProfileIds;
    }

    private getCreateHistoryPayload(session: StoredGameSession): CreateGameHistoryPayload {
        return {
            id: session.currentGameId,
            sessionId: session.id,
            createdAt: session.createdAt
        };
    }

    private maybeShutdownAfterSessionFinished(): void {
        if (!this.scheduledShutdown || this.shutdownRequested || this.listStoredSessions().some((session) => session.state !== 'finished')) {
            return;
        }

        this.requestApplicationShutdown('all-sessions-finished');
    }

    private requestApplicationShutdown(trigger: ShutdownTrigger): void {
        if (this.shutdownRequested) {
            return;
        }

        this.shutdownRequested = true;
        this.clearScheduledShutdownTimer();
        this.logger.info({
            event: 'shutdown.requested',
            trigger,
            shutdownAt: this.scheduledShutdown?.shutdownAt ?? null
        }, 'Requesting application shutdown');

        this.shutdownHandler?.();
    }

    private clearScheduledShutdownTimer(): void {
        if (!this.scheduledShutdownTimer) {
            return;
        }

        clearTimeout(this.scheduledShutdownTimer);
        this.scheduledShutdownTimer = null;
    }

    private listStoredSessions(): StoredGameSession[] {
        return Array.from(this.sessions.values());
    }

    private findSessionsByParticipant(participantId: string): StoredGameSession[] {
        return this.listStoredSessions().filter((session) =>
            session.players.some((participant) => participant.id === participantId)
            || session.spectators.some((participant) => participant.id === participantId)
        );
    }
}
