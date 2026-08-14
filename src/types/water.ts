export interface Point2D {
  x: number;
  y: number;
}

export type NodeType = 'Junction' | 'Reservoir' | 'Tank';
export type LinkType = 'Pipe' | 'Pump' | 'Valve';

export interface BaseNode {
  id: string;
  type: NodeType;
  elevation: number;
  x?: number;
  y?: number;
}

export interface Junction extends BaseNode {
  type: 'Junction';
  baseDemand: number;
  demandPattern?: string;
}

export interface Reservoir extends BaseNode {
  type: 'Reservoir';
  totalHead: number; // hydraulic grade
}

export interface Tank extends BaseNode {
  type: 'Tank';
  initialLevel: number;
  minLevel: number;
  maxLevel: number;
  diameter: number;
}

export type WaterNode = Junction | Reservoir | Tank;

export interface BaseLink {
  id: string;
  type: LinkType;
  startNode: string; // ID of start node
  endNode: string; // ID of end node
}

export interface Pipe extends BaseLink {
  type: 'Pipe';
  length: number; // m
  diameter: number; // mm
  roughness: number; // Hazen-Williams C or Darcy-Weisbach roughness
  status: 'Open' | 'Closed';
  minorLoss?: number;
}

export interface Pump extends BaseLink {
  type: 'Pump';
  pumpCurve?: string;
  designFlow?: number;
  designHead?: number;
  status: 'Open' | 'Closed';
}

export interface Valve extends BaseLink {
  type: 'Valve';
  valveType: 'PRV' | 'PSV' | 'PBV' | 'FCV' | 'TCV' | 'GPV';
  setting: number;
  status: 'Open' | 'Closed' | 'Active';
}

export type WaterLink = Pipe | Pump | Valve;

export interface WaterNetworkModel {
  nodes: WaterNode[];
  links: WaterLink[];
  hydraulicMethod: 'H-W' | 'D-W' | 'C-M';
}

// Result Types
export interface NodeResult {
  id: string;
  demand: number;
  head: number;
  pressure: number;
}

export interface LinkResult {
  id: string;
  flow: number;
  velocity: number;
  headloss: number;
  status: string;
}

export interface HydraulicResults {
  nodes: Record<string, NodeResult>;
  links: Record<string, LinkResult>;
  totalDemand: number;
  totalSupply: number;
  maxPressure: number;
  minPressure: number;
  maxVelocity: number;
  maxHeadloss: number;
  balanceError: number;
  converged: boolean;
  iterations: number;
}

export interface SimulationWarning {
  id: string;
  type: 'LowPressure' | 'HighPressure' | 'HighVelocity' | 'HighHeadloss' | 'NegativePressure' | 'Disconnected';
  message: string;
  level: 'Warning' | 'Critical';
}

export interface WaterProjectState {
  model: WaterNetworkModel;
  results: HydraulicResults | null;
  warnings: SimulationWarning[];
  selectedNodeId: string | null;
  selectedLinkId: string | null;
}
