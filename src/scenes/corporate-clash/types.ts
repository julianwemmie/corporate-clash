import type { Renderer } from '../../engine/types.js';

// --- Constants ---

export const STARTING_FUNDS = 500_000;
export const MAP_DEFENSE = 0;
export const OFFICE_EMPLOYEE_HEALTH = 1;

// --- Game Phase ---

export type GamePhase = 'playing' | 'gameOver';

// --- Grid ---

export interface GridPos {
  row: number;
  col: number;
}

// --- Buildings ---

export type BuildingType =
  | 'smallOffice'
  | 'mediumOffice'
  | 'skyscraper'
  | 'lawfirm';

export type EmployeeBuildingType = 'office' | 'lawfirm';

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

export const BUILDING_TYPES: BuildingType[] = [
  'smallOffice',
  'mediumOffice',
  'skyscraper',
  'lawfirm',
];

// --- Employees ---

export type OfficeEmployeeType =
  | 'officeWorker'
  | 'staff'
  | 'engineer'
  | 'marketing';

export type LawfirmEmployeeType = 'juniorLawyer';
// | 'associateLawyer'
// | 'seniorCounselLawyer';

export type OfficeType = 'office' | 'law';

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
    profitPerTick: -100,
    color: 0x8e44ad,
    health: 3 * OFFICE_EMPLOYEE_HEALTH,
    defenseBoost: 100,
  },
};
export const LAWFIRM_EMPLOYEE_TYPES: LawfirmEmployeeType[] = [
  'juniorLawyer',
  // | 'associateLawyer'
  // | 'seniorCounselLawyer';
];

export function getEmployeeCategory(type: string): OfficeType | null {
  if ((OFFICE_EMPLOYEE_TYPES as string[]).includes(type)) return 'office';
  if ((LAWFIRM_EMPLOYEE_TYPES as string[]).includes(type)) return 'law';
  return null;
}

// --- World State ---

export interface OfficeEmployee {
  type: OfficeEmployeeType;
}
export interface LawfirmEmployee {
  type: LawfirmEmployeeType;
}

export interface Building {
  type: BuildingType;
  employees: OfficeEmployee[] | LawfirmEmployee[];
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
  | { kind: 'lawfirmEmployeePanel'; tile: GridPos };

export interface CorporateWorld {
  phase: GamePhase;
  funds: number;
  mapDefense: number;
  grid: Tile[][];
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
