import { PLACE_CELL_HEX_RADIUS, getCellKey, getHexDistance } from '@ih3t/shared'
import type { BoardCell, DatabaseGamePlayer, PlayerNames, PlayerTileConfig } from '@ih3t/shared'

export const HEX_RADIUS = PLACE_CELL_HEX_RADIUS
export { getCellKey }
export const MIN_SCALE = 12
export const MAX_SCALE = 200
export const DEFAULT_SCALE = 42
export const GRID_LINE_COLOR = 'rgba(148, 163, 184, 0.18)'

const SQRT_THREE = Math.sqrt(3)

export interface HexCell {
  x: number
  y: number
}

interface CubeCell {
  x: number
  y: number
  z: number
}

export interface RenderableCell extends HexCell {
  key: string

  pointX: number
  pointY: number

  color: string | null,
}

export type TilePieceMarker = 'X' | 'O'

type PlayerReference = string | DatabaseGamePlayer

function getPlayerId(player: PlayerReference): string {
  return typeof player === 'string' ? player : player.playerId
}

function getDatabasePlayerDisplayName(players: readonly PlayerReference[], playerId: string): string | null {
  const player = players.find((candidate) => typeof candidate !== 'string' && candidate.playerId === playerId)
  if (!player || typeof player === 'string') {
    return null
  }

  return player.displayName.trim() || null
}

export function getPlayerTileColor(
  playerTiles: Record<string, PlayerTileConfig> | null | undefined,
  playerId: string
): string {
  return playerTiles?.[playerId]?.color ?? '#FF00FF'
}

export function getPlayerLabel(
  players: readonly PlayerReference[],
  playerId: string | null,
  playerNames?: PlayerNames,
  fallbackName: string = 'A player'
): string {
  if (!playerId) {
    return fallbackName
  }

  const embeddedPlayerName = getDatabasePlayerDisplayName(players, playerId)
  if (embeddedPlayerName) {
    return embeddedPlayerName
  }

  const playerName = playerNames?.[playerId]?.trim()
  if (playerName) {
    return playerName
  }

  const playerIndex = players.findIndex((player) => getPlayerId(player) === playerId)
  if (playerIndex === -1) {
    return fallbackName
  }

  return `Player ${playerIndex + 1}`
}

export function axialToUnitPoint(x: number, y: number) {
  return {
    x: SQRT_THREE * (x + y / 2),
    y: 1.5 * y
  }
}

export function pixelToAxial(unitX: number, unitY: number): HexCell {
  const fractionalX = (SQRT_THREE / 3) * unitX - unitY / 3
  const fractionalY = (2 / 3) * unitY
  return roundAxial(fractionalX, fractionalY)
}

export function traceHexPath(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number
) {
  context.beginPath()
  for (let corner = 0; corner < 6; corner += 1) {
    const angle = (Math.PI / 180) * (60 * corner - 30)
    const x = centerX + radius * Math.cos(angle)
    const y = centerY + radius * Math.sin(angle)
    if (corner === 0) {
      context.moveTo(x, y)
    } else {
      context.lineTo(x, y)
    }
  }
  context.closePath()
}

export function sameCell(a: HexCell | null, b: HexCell | null) {
  if (!a && !b) return true
  if (!a || !b) return false
  return a.x === b.x && a.y === b.y
}

export function buildHexLine(start: HexCell, end: HexCell): HexCell[] {
  const distance = hexDistance(start, end)
  if (distance === 0) {
    return [{ x: start.x, y: start.y }]
  }

  const startCube = axialToCube(start)
  const endCube = axialToCube(end)
  const cells: HexCell[] = []

  for (let step = 0; step <= distance; step += 1) {
    const progress = step / distance
    const cube = roundCube({
      x: lerp(startCube.x, endCube.x, progress),
      y: lerp(startCube.y, endCube.y, progress),
      z: lerp(startCube.z, endCube.z, progress)
    })
    const cell = { x: cube.x, y: cube.z }
    if (!sameCell(cells[cells.length - 1] ?? null, cell)) {
      cells.push(cell)
    }
  }

  return cells
}

export function formatCountdown(milliseconds: number | null): string {
  if (milliseconds === null) {
    return '--:--'
  }

  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
}

export function getTouchDistance(touches: React.TouchList): number {
  if (touches.length < 2) {
    return 0
  }

  const [firstTouch, secondTouch] = [touches[0], touches[1]]
  const deltaX = firstTouch.clientX - secondTouch.clientX
  const deltaY = firstTouch.clientY - secondTouch.clientY
  return Math.hypot(deltaX, deltaY)
}

export function getTouchCenter(touches: React.TouchList) {
  if (touches.length === 0) {
    return null
  }

  if (touches.length === 1) {
    return {
      x: touches[0].clientX,
      y: touches[0].clientY
    }
  }

  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2
  }
}

export function buildRenderableCells(cells: BoardCell[], tileConfigs: Record<string, PlayerTileConfig>): Map<string, RenderableCell> {
  const renderableCells = new Map<string, RenderableCell>()

  if (cells.length === 0) {
    const origin = axialToUnitPoint(0, 0)
    renderableCells.set(getCellKey(0, 0), {
      key: getCellKey(0, 0),

      x: 0,
      y: 0,

      pointX: origin.x,
      pointY: origin.y,

      color: null
    })
    return renderableCells
  }

  for (const cell of cells) {
    for (let x = cell.x - HEX_RADIUS; x <= cell.x + HEX_RADIUS; x += 1) {
      for (let y = cell.y - HEX_RADIUS; y <= cell.y + HEX_RADIUS; y += 1) {
        if (hexDistance(cell, { x, y }) <= HEX_RADIUS) {
          const key = getCellKey(x, y)
          if (!renderableCells.has(key)) {
            const point = axialToUnitPoint(x, y)
            renderableCells.set(key, { key, x, y, pointX: point.x, pointY: point.y, color: null })
          }
        }
      }
    }

    const key = getCellKey(cell.x, cell.y)
    const point = axialToUnitPoint(cell.x, cell.y)
    renderableCells.set(key, { key, x: cell.x, y: cell.y, pointX: point.x, pointY: point.y, color: tileConfigs[cell.occupiedBy]?.color ?? null })
  }

  return renderableCells
}

export function buildTilePieceMarkerMap(cells: readonly BoardCell[]): Map<string, TilePieceMarker> {
  const tilePieceMarkers = new Map<string, TilePieceMarker>()
  const xPlayerId = cells.find((cell) => cell.x === 0 && cell.y === 0)?.occupiedBy ?? null
  if (!xPlayerId) {
    return tilePieceMarkers
  }

  for (const cell of cells) {
    tilePieceMarkers.set(getCellKey(cell.x, cell.y), cell.occupiedBy === xPlayerId ? 'X' : 'O')
  }

  return tilePieceMarkers
}

function hexDistance(a: HexCell, b: HexCell): number {
  return getHexDistance(a, b)
}

function axialToCube(cell: HexCell): CubeCell {
  return {
    x: cell.x,
    y: -cell.x - cell.y,
    z: cell.y
  }
}

function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress
}

function roundAxial(x: number, y: number): HexCell {
  const cube = roundCube({ x, y: -x - y, z: y })
  return { x: cube.x, y: cube.z }
}

function roundCube(cube: CubeCell): CubeCell {
  let roundedX = Math.round(cube.x)
  let roundedY = Math.round(cube.y)
  let roundedZ = Math.round(cube.z)

  const deltaX = Math.abs(roundedX - cube.x)
  const deltaY = Math.abs(roundedY - cube.y)
  const deltaZ = Math.abs(roundedZ - cube.z)

  if (deltaX > deltaY && deltaX > deltaZ) {
    roundedX = -roundedY - roundedZ
  } else if (deltaY > deltaZ) {
    roundedY = -roundedX - roundedZ
  } else {
    roundedZ = -roundedX - roundedY
  }

  return { x: roundedX, y: roundedY, z: roundedZ }
}
