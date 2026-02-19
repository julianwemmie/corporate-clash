import type { Renderer } from '../../engine/types.js';

// --- Game Phase ---

export type GamePhase = 'playing' | 'gameOver';

// --- Grid ---

export interface GridPos {
  row: number;
  col: number;
}

// --- Buildings ---

export type BuildingType = 'smallOffice' | 'mediumOffice' | 'skyscraper';

export interface BuildingConfig {
  label: string;
  cost: number;
  capacity: number;
  color: number;
}

export const BUILDING_CONFIG: Record<BuildingType, BuildingConfig> = {
  smallOffice: {
    label: 'Small Office',
    cost: 50_000,
    capacity: 10,
    color: 0x4a90d9,
  },
  mediumOffice: {
    label: 'Medium Office',
    cost: 150_000,
    capacity: 20,
    color: 0x357abd,
  },
  skyscraper: {
    label: 'Skyscraper',
    cost: 400_000,
    capacity: 30,
    color: 0x1a5276,
  },
};

export const BUILDING_TYPES: BuildingType[] = [
  'smallOffice',
  'mediumOffice',
  'skyscraper',
];

// --- Employees ---

export type EmployeeType = 'staff' | 'engineer' | 'marketing' | 'officeWorker';

export interface EmployeeConfig {
  label: string;
  cost: number;
  profitPerTick: number;
  color: number;
}

export const EMPLOYEE_CONFIG: Record<EmployeeType, EmployeeConfig> = {
  officeWorker: {
    label: 'Office Worker',
    cost: 5_000,
    profitPerTick: 800,
    color: 0x95a5a6,
  },
  staff: {
    label: 'Staff',
    cost: 10_000,
    profitPerTick: 2_000,
    color: 0x27ae60,
  },
  marketing: {
    label: 'Marketing',
    cost: 25_000,
    profitPerTick: 5_000,
    color: 0xe67e22,
  },
  engineer: {
    label: 'Engineer',
    cost: 40_000,
    profitPerTick: 8_000,
    color: 0x8e44ad,
  },
};

export const EMPLOYEE_TYPES: EmployeeType[] = [
  'officeWorker',
  'staff',
  'marketing',
  'engineer',
];

// --- World State ---

export interface Employee {
  type: EmployeeType;
}

export interface Building {
  type: BuildingType;
  employees: Employee[];
}

export interface Tile {
  row: number;
  col: number;
  building: Building | null;
}

export type UIMode =
  | { kind: 'none' }
  | { kind: 'buildingPanel'; tile: GridPos }
  | { kind: 'employeePanel'; tile: GridPos }
  | { kind: 'alert' };

export interface DamageReport {
  buildingsLost: number;
  employeesLost: number;
}
export interface CorporateWorld {
  phase: GamePhase;
  funds: number;
  grid: Tile[][];
  selectedTile: GridPos | null;
  uiMode: UIMode;
  hoveredTile: GridPos | null;
  attackActive: DamageReport | null;
  attackTimer: number;
}

// --- Constants ---

export const STARTING_FUNDS = 500_000;
export const ATTACK_INTERVAL_TICKS = 200;

// --- Factory ---

export function createWorld(gridSize: number): CorporateWorld {
  const grid: Tile[][] = [];
  for (let row = 0; row < gridSize; row++) {
    const rowTiles: Tile[] = [];
    for (let col = 0; col < gridSize; col++) {
      rowTiles.push({ row, col, building: null });
    }
    grid.push(rowTiles);
  }

  return {
    phase: 'playing',
    funds: STARTING_FUNDS,
    grid,
    selectedTile: null,
    uiMode: { kind: 'none' },
    hoveredTile: null,
    attackActive: null,
    attackTimer: ATTACK_INTERVAL_TICKS,
  };
}

// --- Manager Interface ---

export interface Manager {
  update?(world: CorporateWorld, dt: number): void;
  render?(world: CorporateWorld, renderer: Renderer): void;
  onRightClick?(world: CorporateWorld, pixelX: number, pixelY: number): void;
  onLeftClick?(world: CorporateWorld, pixelX: number, pixelY: number): void;
  onMouseMove?(world: CorporateWorld, pixelX: number, pixelY: number): void;
  onKeyDown?(world: CorporateWorld, key: string): void;
  onKeyUp?(world: CorporateWorld, key: string): void;
  destroy?(): void;
}
