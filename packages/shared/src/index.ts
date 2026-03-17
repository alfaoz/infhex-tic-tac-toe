export type SessionState = 'lobby' | 'ingame' | 'finished';
export type CellOccupant = string & { _type?: "CellOccupant" };
export type SessionFinishReason = 'disconnect' | 'timeout' | 'terminated' | 'five-in-a-row';

export interface BoardCell {
    x: number;
    y: number;
    occupiedBy: CellOccupant;
}

export interface BoardState {
    cells: BoardCell[];
    currentTurnPlayerId: string | null;
    placementsRemaining: number;
    currentTurnExpiresAt: number | null;
}

// Game Session Types
export interface GameSession {
    id: string;
    players: string[];
    maxPlayers: 2; // Fixed to 2 players
    state: SessionState;
    gameState: BoardState;
}

export interface CreateSessionRequest {
    // No maxPlayers needed since it's always 2
}

export interface CreateSessionResponse {
    sessionId: string;
}

export interface SessionInfo {
    id: string;
    playerCount: number;
    maxPlayers: 2; // Always 2
    state: SessionState;
    canJoin: boolean; // Whether the session can accept new players
}

// Socket Event Types
export interface ServerToClientEvents {
    'sessions-updated': (sessions: SessionInfo[]) => void;
    'session-joined': (data: { sessionId: string; state: SessionState }) => void;
    'session-finished': (data: { sessionId: string; winningPlayerId: string | null; reason: SessionFinishReason }) => void;
    'player-joined': (data: { playerId: string; players: string[]; state: SessionState }) => void;
    'player-left': (data: { playerId: string; players: string[]; state: SessionState }) => void;
    'game-state': (data: { sessionId: string; sessionState: SessionState, gameState: BoardState }) => void;
    error: (error: string) => void;
}

export interface ClientToServerEvents {
    'join-session': (sessionId: string) => void;
    'leave-session': (sessionId: string) => void;
    'place-cell': (data: { sessionId: string; x: number; y: number }) => void;
}

// Common utility types
export interface Position {
    x: number;
    y: number;
}

export interface Size {
    width: number;
    height: number;
}

export interface Player {
    id: string;
    name?: string;
    position?: Position;
    color?: string;
}
