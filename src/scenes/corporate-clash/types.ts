import type { Renderer } from '../../engine/types.js';

// --- Game Phase ---
export type GamePhase = 'playing' | 'gameOver';

// --- Grid ---
export interface GridPos {
  row: number;
  col: number;
}

// --- Constants ---

export const STARTING_FUNDS = 500_000;
export const ATTACK_INTERVAL_TICKS = 200;
export const MAP_DEFENSE = 0;
export const OFFICE_EMPLOYEE_HEALTH = 1;

// --- Buildings ---
export type BuildingType =
  | 'smallOffice'
  | 'mediumOffice'
  | 'skyscraper'
  | 'lawfirm';

export const BUILDING_TYPES: BuildingType[] = [
  'smallOffice',
  'mediumOffice',
  'skyscraper',
  'lawfirm',
];

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
  lawfirm: {
    label: 'Lawfirm',
    cost: 50_000,
    capacity: 10,
    color: 0x1a5276,
  },
};

// --- Employees ---

export type OfficeEmployeeType =
  | 'officeWorker'
  | 'staff'
  | 'engineer'
  | 'marketing';

export type LawfirmEmployeeType =
  | 'juniorLawyer'
  | 'associateLawyer'
  | 'seniorCounselLawyer';

export interface EmployeeConfig {
  label: string;
  cost: number;
  profitPerTick: number;
  color: number;
  health: number;
  defenseBoost: number;
}

export const OFFICE_EMPLOYEE_CONFIG: Record<
  OfficeEmployeeType,
  EmployeeConfig
> = {
  officeWorker: {
    label: 'Office Worker',
    cost: 5_000,
    profitPerTick: 800,
    color: 0x95a5a6,
    health: OFFICE_EMPLOYEE_HEALTH,
    defenseBoost: 0,
  },
  staff: {
    label: 'Staff',
    cost: 10_000,
    profitPerTick: 2_000,
    color: 0x27ae60,
    health: OFFICE_EMPLOYEE_HEALTH,
    defenseBoost: 0,
  },
  marketing: {
    label: 'Marketing',
    cost: 25_000,
    profitPerTick: 5_000,
    color: 0xe67e22,
    health: OFFICE_EMPLOYEE_HEALTH,
    defenseBoost: 0,
  },
  engineer: {
    label: 'Engineer',
    cost: 40_000,
    profitPerTick: 8_000,
    color: 0x8e44ad,
    health: 1,
    defenseBoost: 0,
  },
};

export const OFFICE_EMPLOYEE_TYPES: OfficeEmployeeType[] = [
  'officeWorker',
  'staff',
  'marketing',
  'engineer',
];

export const LAWFIRM_EMPLOYEE_CONFIG: Record<
  LawfirmEmployeeType,
  EmployeeConfig
> = {
  juniorLawyer: {
    label: 'Junior Lawyer',
    cost: 50_000,
    profitPerTick: -1000,
    color: 0x8e44ad,
    health: 3 * OFFICE_EMPLOYEE_HEALTH,
    defenseBoost: 100,
  },
  associateLawyer: {
    label: 'Associate Lawyer',
    cost: 100_000,
    profitPerTick: -5000,
    color: 0x8e44ad,
    health: 4 * OFFICE_EMPLOYEE_HEALTH,
    defenseBoost: 500,
  },
  seniorCounselLawyer: {
    label: 'Senior Counsel Lawyer',
    cost: 200_000,
    profitPerTick: -10000,
    color: 0x8e44ad,
    health: 5 * OFFICE_EMPLOYEE_HEALTH,
    defenseBoost: 1000,
  },
};
export const LAWFIRM_EMPLOYEE_TYPES: LawfirmEmployeeType[] = [
  'juniorLawyer',
  'associateLawyer',
  'seniorCounselLawyer',
];

export type EmployeeType = OfficeEmployeeType | LawfirmEmployeeType;
export type EmployeeBuildingType = OfficeType;

export const EMPLOYEE_TYPES: EmployeeType[] = [
  ...OFFICE_EMPLOYEE_TYPES,
  ...LAWFIRM_EMPLOYEE_TYPES,
];

export const EMPLOYEE_CONFIG: Record<EmployeeType, EmployeeConfig> = {
  ...OFFICE_EMPLOYEE_CONFIG,
  ...LAWFIRM_EMPLOYEE_CONFIG,
};

export function getEmployeeCategory(type: string): OfficeType {
  if ((OFFICE_EMPLOYEE_TYPES as string[]).includes(type)) return 'office';
  if ((LAWFIRM_EMPLOYEE_TYPES as string[]).includes(type)) return 'lawfirm';
  throw new Error(`Unknown employee type: ${type}`);
}

// --- World State ---

export interface OfficeEmployee {
  type: OfficeEmployeeType;
}
export interface LawfirmEmployee {
  type: LawfirmEmployeeType;
}

export type OfficeType = 'office' | 'lawfirm';

export interface Building {
  type: BuildingType;
  employees: (OfficeEmployee | LawfirmEmployee)[];
}

export interface Tile {
  row: number;
  col: number;
  building: Building | null;
}

export type UIMode =
  | { kind: 'none' }
  | { kind: 'buildingPanel'; tile: GridPos }
  | { kind: 'officeEmployeePanel'; tile: GridPos }
  | { kind: 'lawfirmEmployeePanel'; tile: GridPos }
  | { kind: 'alert' };

export interface DamageReport {
  buildingsLost: number;
  employeesLost: number;
}

// --- Player Actions (client → server) ---

export type GameAction =
  | { kind: 'build'; row: number; col: number; buildingType: BuildingType }
  | { kind: 'hire'; row: number; col: number; employeeType: EmployeeType };

// --- Server-authoritative state (broadcast to all clients) ---

export interface GameState {
  phase: GamePhase;
  funds: number;
  mapDefense: number;
  grid: Tile[][];
  attackActive: DamageReport | null;
  attackTimer: number;
}

// --- Full client state (GameState + per-player UI) ---

export interface CorporateWorld extends GameState {
  selectedTile: GridPos | null;
  uiMode: UIMode;
  hoveredTile: GridPos | null;
}

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
    mapDefense: MAP_DEFENSE,
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
