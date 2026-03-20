import { randomUUID } from 'node:crypto';
import type {
    GameBoard,
    GameMove,
    LobbyOptions,
    SessionFinishReason,
    SessionInfo,
    SessionParticipant,
    SessionParticipantRole,
    ShutdownState,
} from '@ih3t/shared';
import type { RequestClientInfo, SocketClientInfo } from '../network/clientInfo';
import type { AccountUserProfile } from '../auth/authRepository';

export interface StoredGameSession {
    id: string;
    players: SessionParticipant[];
    spectators: SessionParticipant[];
    gameOptions: LobbyOptions;
    state: 'lobby' | 'in-game' | 'finished';
    createdAt: number;
    startedAt: number | null;
    currentGameId: string;
    moveHistory: GameMove[];
    boardState: GameBoard;
    finishReason: SessionFinishReason | null;
    winningPlayerId: string | null;
    rematchAcceptedPlayerIds: string[];
}

export type PlayerLeaveSource = 'leave-session' | 'disconnect';

export interface PublicGameStatePayload {
    sessionId: string;
    gameId: string;
    gameState: GameBoard;
}

export interface JoinSessionParams {
    sessionId: string;
    participantId?: string | null;
    client: SocketClientInfo;
    user: AccountUserProfile;
}

export interface JoinSessionResult {
    sessionId: string;
    participantId: string;
    role: SessionParticipantRole;
    session: SessionInfo;
    isNewParticipant: boolean;
    gameState?: PublicGameStatePayload;
}

export interface CreateSessionParams {
    client: RequestClientInfo;
    lobbyOptions: LobbyOptions;
}

export interface ParticipantLeftEvent {
    sessionId: string;
    participantId: string;
    participantRole: SessionParticipantRole;
    session: SessionInfo;
}

export interface ParticipantJoinedEvent {
    sessionId: string;
    participantId: string;
    participantRole: SessionParticipantRole;
    session: SessionInfo;
}

export interface SessionUpdatedEvent {
    sessionId: string;
    session: SessionInfo;
}

export interface SessionManagerEventHandlers {
    sessionsUpdated?: (sessions: SessionInfo[]) => void;
    shutdownUpdated?: (shutdown: ShutdownState | null) => void;
    sessionUpdated?: (event: SessionUpdatedEvent) => void;
    gameStateUpdated?: (payload: PublicGameStatePayload) => void;
    participantJoined?: (event: ParticipantJoinedEvent) => void;
    participantLeft?: (event: ParticipantLeftEvent) => void;
}

export interface RematchRequestResult {
    status: 'pending' | 'ready';
    players: string[];
}

export interface RematchSessionResult {
    sessionId: string;
    session: SessionInfo;
}

export function cloneGameOptions(gameOptions: LobbyOptions): LobbyOptions {
    return {
        ...gameOptions,
        timeControl: { ...gameOptions.timeControl }
    };
}

export function cloneSessionParticipant(participant: SessionParticipant): SessionParticipant {
    return { ...participant };
}

export function cloneParticipants(participants: SessionParticipant[]): SessionParticipant[] {
    return participants.map((participant) => cloneSessionParticipant(participant));
}

export function cloneGameBoard(boardState: GameBoard): GameBoard {
    return {
        ...boardState,
        cells: boardState.cells.map((cell) => ({ ...cell })),
        playerTimeRemainingMs: { ...boardState.playerTimeRemainingMs }
    };
}

export function createStoredGameSession(
    sessionId: string,
    gameOptions: LobbyOptions,
    createdAt = Date.now()
): StoredGameSession {
    return {
        id: sessionId,
        players: [],
        spectators: [],
        gameOptions: cloneGameOptions(gameOptions),
        state: 'lobby',
        createdAt,
        startedAt: null,
        currentGameId: randomUUID(),
        moveHistory: [],
        boardState: {
            cells: [],
            currentTurnPlayerId: null,
            placementsRemaining: 0,
            currentTurnExpiresAt: null,
            playerTimeRemainingMs: {}
        },
        finishReason: null,
        winningPlayerId: null,
        rematchAcceptedPlayerIds: []
    };
}

export function buildSessionParticipant(participantId: string, user: AccountUserProfile): SessionParticipant {
    return {
        id: participantId,
        displayName: user.username,
        profileId: user.id.startsWith('guest:') ? null : user.id
    };
}
