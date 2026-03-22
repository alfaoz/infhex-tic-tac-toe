import { injectable } from 'tsyringe';
import {
    buildPlayerTileConfigMap,
    getCellKey,
    isCellWithinPlacementRadius,
    PLACE_CELL_HEX_RADIUS,
    type GameState,
    zCellOccupant,
    type BoardCell,
    type GameMove
} from '@ih3t/shared';

interface ApplyMoveParams {
    playerId: string;
    x: number;
    y: number;
    timestamp?: number;
}

interface ApplyMoveResult {
    move: GameMove;
    turnCompleted: boolean;
    winningPlayerId: string | null;
}

export class SimulationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SimulationError';
    }
}

@injectable()
export class GameSimulation {
    startSession(boardState: GameState, playerIds: readonly string[]): void {
        boardState.playerTiles = buildPlayerTileConfigMap(playerIds);
        boardState.highlightedCells = [];
        this.setTurn(boardState, playerIds[0] ?? null, 1);
    }

    getPublicGameState(boardState: GameState): GameState {
        return {
            cells: this.getBoardCells(boardState),
            highlightedCells: boardState.highlightedCells.map((cell) => ({ ...cell })),
            playerTiles: Object.fromEntries(
                Object.entries(boardState.playerTiles).map(([playerId, playerTileConfig]) => [playerId, { ...playerTileConfig }])
            ),
            currentTurnPlayerId: boardState.currentTurnPlayerId,
            placementsRemaining: boardState.placementsRemaining,
            currentTurnExpiresAt: boardState.currentTurnExpiresAt,
            playerTimeRemainingMs: { ...boardState.playerTimeRemainingMs }
        };
    }

    applyMove(boardState: GameState, params: ApplyMoveParams): ApplyMoveResult {
        const { playerId, x, y } = params;
        const timestamp = params.timestamp ?? Date.now();

        if (boardState.currentTurnPlayerId !== playerId) {
            throw new SimulationError('It is not your turn');
        }

        if (boardState.placementsRemaining <= 0) {
            throw new SimulationError('No placements remaining this turn');
        }

        const cellKey = getCellKey(x, y);
        const isOccupied = boardState.cells.some((cell) => getCellKey(cell.x, cell.y) === cellKey);
        if (isOccupied) {
            throw new SimulationError('Cell is already occupied');
        }

        if (boardState.cells.length === 0 && (x !== 0 || y !== 0)) {
            throw new SimulationError('First placement must be at the origin');
        }

        if (!isCellWithinPlacementRadius(boardState.cells, { x, y })) {
            throw new SimulationError(`Cell must be within ${PLACE_CELL_HEX_RADIUS} hexes of an existing placed cell`);
        }
        const isFirstPlacementOfTurn = boardState.cells.length === 0 || boardState.placementsRemaining === 2;
        const turnCompleted = boardState.placementsRemaining === 1;
        const playerIds = Object.keys(boardState.playerTiles);

        const move: GameMove = {
            moveNumber: boardState.cells.length + 1,
            playerId,
            x,
            y,
            timestamp
        };

        boardState.cells.push({
            x,
            y,
            occupiedBy: zCellOccupant.parse(playerId)
        });
        boardState.highlightedCells = isFirstPlacementOfTurn
            ? [{ x, y }]
            : [...boardState.highlightedCells, { x, y }].slice(-2);
        boardState.placementsRemaining -= 1;

        if (this.hasSixInARow(boardState, playerId, x, y)) {
            return {
                move,
                turnCompleted,
                winningPlayerId: playerId
            };
        }

        if (turnCompleted) {
            const currentPlayerIndex = playerIds.findIndex((existingPlayerId) => existingPlayerId === playerId);
            const nextPlayerIndex = currentPlayerIndex === 0 ? 1 : 0;
            this.setTurn(boardState, playerIds[nextPlayerIndex] ?? playerId, 2);
        }

        return {
            move,
            turnCompleted,
            winningPlayerId: null
        };
    }

    private setTurn(boardState: GameState, playerId: string | null, placementsRemaining: number): void {
        boardState.currentTurnPlayerId = playerId;
        boardState.placementsRemaining = playerId ? placementsRemaining : 0;
        if (!playerId) {
            boardState.currentTurnExpiresAt = null;
        }
    }

    private getBoardCells(boardState: GameState): BoardCell[] {
        return [...boardState.cells].sort((a, b) => {
            if (a.y === b.y) {
                return a.x - b.x;
            }

            return a.y - b.y;
        });
    }

    private hasSixInARow(boardState: GameState, playerId: string, x: number, y: number): boolean {
        const occupiedCells = new Set(
            boardState.cells
                .filter((cell) => cell.occupiedBy === playerId)
                .map((cell) => getCellKey(cell.x, cell.y))
        );
        const directions: Array<[number, number]> = [
            [1, 0],
            [0, 1],
            [1, -1]
        ];

        return directions.some(([directionX, directionY]) => {
            const connectedCount =
                1 +
                this.countConnectedTiles(occupiedCells, x, y, directionX, directionY) +
                this.countConnectedTiles(occupiedCells, x, y, -directionX, -directionY);

            return connectedCount >= 6;
        });
    }

    private countConnectedTiles(
        occupiedCells: Set<string>,
        startX: number,
        startY: number,
        directionX: number,
        directionY: number
    ): number {
        let count = 0;
        let currentX = startX + directionX;
        let currentY = startY + directionY;

        while (occupiedCells.has(getCellKey(currentX, currentY))) {
            count += 1;
            currentX += directionX;
            currentY += directionY;
        }

        return count;
    }
}
