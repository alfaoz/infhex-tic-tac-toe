export interface SealEngine {
    getMove(movesA: number[], movesB: number[], currentPlayer: 1 | 2, timelimitMs: number): number[]
}

export default function (): Promise<SealEngine>;