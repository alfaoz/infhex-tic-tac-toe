import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
    BoardCell,
    GameSession,
    CreateSessionResponse,
    SessionInfo,
    SessionState,
    ServerToClientEvents,
    ClientToServerEvents,
    GameAction
} from '@ih3t/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const allowedOrigins = new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173'
]);
const corsOptions: cors.CorsOptions = {
    origin(origin, callback) {
        // Allow non-browser requests and configured dev origins.
        if (!origin || allowedOrigins.has(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    credentials: true
};

// CORS middleware for API requests
app.use(cors(corsOptions));

const server = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
    cors: corsOptions
});

const gameSessions = new Map<string, GameSession>();

function getCellKey(x: number, y: number): string {
    return `${x},${y}`;
}

function getBoardCells(session: GameSession): BoardCell[] {
    return [...session.gameState.cells].sort((a, b) => {
        if (a.y === b.y) {
            return a.x - b.x;
        }

        return a.y - b.y;
    });
}

function emitGameState(sessionId: string): void {
    const session = gameSessions.get(sessionId);
    if (!session) {
        return;
    }

    io.to(sessionId).emit('game-state', {
        sessionId,
        gameState: {
            cells: getBoardCells(session),
            currentTurnPlayerId: session.gameState.currentTurnPlayerId,
            placementsRemaining: session.gameState.placementsRemaining
        }
    });
}

function getSessionList(): SessionInfo[] {
    return Array.from(gameSessions.values()).map(session => ({
        id: session.id,
        playerCount: session.players.length,
        maxPlayers: session.maxPlayers,
        state: session.state,
        canJoin: session.state === 'lobby' && session.players.length < session.maxPlayers
    }));
}

function broadcastSessions(): void {
    io.emit('sessions-updated', getSessionList());
}

function updateSessionState(session: GameSession): SessionState {
    if (session.players.length >= session.maxPlayers) {
        session.state = 'ingame';
        if (!session.gameState.currentTurnPlayerId) {
            session.gameState.currentTurnPlayerId = session.players[0] ?? null;
            session.gameState.placementsRemaining = 2;
        }
    } else if (session.state !== 'finished') {
        session.state = 'lobby';
        session.gameState.currentTurnPlayerId = null;
        session.gameState.placementsRemaining = 0;
    }

    return session.state;
}

function finishSession(sessionId: string, disconnectingPlayerId: string): void {
    const session = gameSessions.get(sessionId);
    if (!session) {
        return;
    }

    const winnerId = session.players.find((playerId) => playerId !== disconnectingPlayerId);
    session.state = 'finished';

    if (winnerId) {
        io.to(sessionId).emit('session-finished', { sessionId, winnerId });
    }

    gameSessions.delete(sessionId);
    broadcastSessions();
}

// Serve static files from dist in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(join(__dirname, '../dist')));
}

// API routes
app.get('/api/sessions', (_req, res) => {
    res.json(getSessionList());
});

app.post('/api/sessions', express.json(), (_req, res) => {
    const sessionId = Math.random().toString(36).substring(2, 8);

    const session: GameSession = {
        id: sessionId,
        players: [],
        maxPlayers: 2,
        state: 'lobby',
        gameState: {
            cells: [],
            currentTurnPlayerId: null,
            placementsRemaining: 0
        }
    };

    gameSessions.set(sessionId, session);
    broadcastSessions();
    const response: CreateSessionResponse = { sessionId };
    res.json(response);
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);
    socket.emit('sessions-updated', getSessionList());

    socket.on('join-session', (sessionId: string) => {
        const session = gameSessions.get(sessionId);
        if (!session) {
            socket.emit('error', 'Session not found');
            return;
        }

        if (session.players.length >= session.maxPlayers) {
            socket.emit('error', 'Session is full');
            return;
        }

        session.players.push(socket.id);
        socket.join(sessionId);
        const state = updateSessionState(session);

        // Notify all players in the session
        io.to(sessionId).emit('player-joined', {
            playerId: socket.id,
            players: session.players,
            state
        });
        emitGameState(sessionId);
        broadcastSessions();

        console.log(`Player ${socket.id} joined session ${sessionId}`);
    });

    socket.on('leave-session', (sessionId: string) => {
        const session = gameSessions.get(sessionId);
        if (session) {
            const wasInGame = session.state === 'ingame';

            if (wasInGame) {
                finishSession(sessionId, socket.id);
                socket.leave(sessionId);
                return;
            }

            session.players = session.players.filter((id: string) => id !== socket.id);
            socket.leave(sessionId);
            const state = updateSessionState(session);

            if (session.players.length === 0) {
                gameSessions.delete(sessionId);
                console.log(`Session ${sessionId} deleted (no players)`);
            } else {
                io.to(sessionId).emit('player-left', {
                    playerId: socket.id,
                    players: session.players,
                    state
                });
            }

            broadcastSessions();
        }
    });

    socket.on('game-action', (data: { sessionId: string; action: GameAction }) => {
        const { sessionId, action } = data;
        // Broadcast the action to all players in the session
        socket.to(sessionId).emit('game-action', { playerId: socket.id, action });
    });

    socket.on('place-cell', (data: { sessionId: string; x: number; y: number }) => {
        const session = gameSessions.get(data.sessionId);
        if (!session) {
            socket.emit('error', 'Session not found');
            return;
        }

        if (session.state !== 'ingame') {
            socket.emit('error', 'Game is not currently active');
            return;
        }

        if (!session.players.includes(socket.id)) {
            socket.emit('error', 'You are not part of this session');
            return;
        }

        if (session.gameState.currentTurnPlayerId !== socket.id) {
            socket.emit('error', 'It is not your turn');
            return;
        }

        if (session.gameState.placementsRemaining <= 0) {
            socket.emit('error', 'No placements remaining this turn');
            return;
        }

        const cellKey = getCellKey(data.x, data.y);
        const isOccupied = session.gameState.cells.some((cell) => getCellKey(cell.x, cell.y) === cellKey);
        if (isOccupied) {
            socket.emit('error', 'Cell is already occupied');
            return;
        }

        session.gameState.cells.push({
            x: data.x,
            y: data.y,
            occupiedBy: socket.id
        });

        session.gameState.placementsRemaining -= 1;
        if (session.gameState.placementsRemaining === 0) {
            const currentPlayerIndex = session.players.indexOf(socket.id);
            const nextPlayerIndex = currentPlayerIndex === 0 ? 1 : 0;
            session.gameState.currentTurnPlayerId = session.players[nextPlayerIndex] ?? socket.id;
            session.gameState.placementsRemaining = 2;
        }

        emitGameState(data.sessionId);
    });

    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);

        // Remove player from all sessions
        for (const [sessionId, session] of gameSessions.entries()) {
            if (session.players.includes(socket.id)) {
                const wasInGame = session.state === 'ingame';

                if (wasInGame) {
                    finishSession(sessionId, socket.id);
                    continue;
                }

                session.players = session.players.filter((id: string) => id !== socket.id);
                const state = updateSessionState(session);

                if (session.players.length === 0) {
                    gameSessions.delete(sessionId);
                } else {
                    io.to(sessionId).emit('player-left', {
                        playerId: socket.id,
                        players: session.players,
                        state
                    });
                }

                broadcastSessions();
            }
        }
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
