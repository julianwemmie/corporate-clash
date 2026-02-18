import type { Renderer } from '../../engine/types.js';

// --- Shared Types ---

export type GameState = 'start' | 'playing' | 'gameOver';
export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Point {
  x: number;
  y: number;
}

// --- Shared Constants ---

export const KEY_DIRECTION: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
};

export const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

export const DELTA: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

// --- Game World ---

export interface SnakeWorld {
  state: GameState;
  gridSize: number;
  player: {
    segments: Point[];
    direction: Direction;
    nextDirection: Direction;
  };
  food: Point;
  score: number;
}

// Factory method for creating SnakeWorld objects
export function createWorld(gridSize: number): SnakeWorld {
  const world: SnakeWorld = {
    state: 'start',
    gridSize,
    player: {
      segments: [],
      direction: 'right',
      nextDirection: 'right',
    },
    food: { x: 0, y: 0 },
    score: 0,
  };
  resetWorld(world);
  return world;
}

export function resetWorld(world: SnakeWorld): void {
  const centerX = Math.floor(world.gridSize / 2);
  const centerY = Math.floor(world.gridSize / 2);
  world.player.segments = [
    { x: centerX, y: centerY },
    { x: centerX - 1, y: centerY },
    { x: centerX - 2, y: centerY },
  ];
  world.player.direction = 'right';
  world.player.nextDirection = 'right';
  world.score = 0;
  spawnFood(world);
}

export function spawnFood(world: SnakeWorld): void {
  const occupied = new Set(world.player.segments.map((p) => `${p.x},${p.y}`));
  const empty: Point[] = [];
  for (let x = 0; x < world.gridSize; x++) {
    for (let y = 0; y < world.gridSize; y++) {
      if (!occupied.has(`${x},${y}`)) {
        empty.push({ x, y });
      }
    }
  }
  if (empty.length === 0) return;
  world.food = empty[Math.floor(Math.random() * empty.length)];
}

// --- Manager Interface ---

export interface Manager {
  update?(world: SnakeWorld, dt: number): void;
  render?(world: SnakeWorld, renderer: Renderer): void;
  onKeyDown?(world: SnakeWorld, key: string): void;
  onKeyUp?(world: SnakeWorld, key: string): void;
  destroy?(): void;
}
