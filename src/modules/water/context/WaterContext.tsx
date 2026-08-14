import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import type { WaterNetworkModel, WaterNode, WaterLink, SimulationWarning, HydraulicResults } from '../../../types/water';

export interface WaterProjectState {
  model: WaterNetworkModel;
  results: HydraulicResults | null;
  warnings: SimulationWarning[];
  selectedNodeId: string | null;
  selectedLinkId: string | null;
  interactionMode: 'select' | 'draw_pipe';
  drawStartNode: string | null;
}

const sampleNodes: WaterNode[] = [
  { id: 'R1', type: 'Reservoir', elevation: 100, totalHead: 100, x: 100, y: 100 } as any, // casting to avoid TS strict type errors if some fields are missing
  { id: 'J1', type: 'Junction', elevation: 80, baseDemand: 50, x: 200, y: 100 } as any,
  { id: 'J2', type: 'Junction', elevation: 75, baseDemand: 30, x: 200, y: 200 } as any,
  { id: 'J3', type: 'Junction', elevation: 70, baseDemand: 40, x: 300, y: 200 } as any,
];

const sampleLinks: WaterLink[] = [
  { id: 'P1', type: 'Pipe', startNode: 'R1', endNode: 'J1', length: 1000, diameter: 200, roughness: 130, status: 'Open' } as any,
  { id: 'P2', type: 'Pipe', startNode: 'J1', endNode: 'J2', length: 1500, diameter: 150, roughness: 130, status: 'Open' } as any,
  { id: 'P3', type: 'Pipe', startNode: 'J2', endNode: 'J3', length: 1000, diameter: 100, roughness: 130, status: 'Open' } as any,
];

const initialModel = {
  nodes: sampleNodes,
  links: sampleLinks,
  hydraulicMethod: 'H-W' as const,
};

const STORAGE_KEY = 'beamlab_water_network_model';

const loadSavedModel = (): WaterNetworkModel => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load saved model:', e);
  }
  return initialModel;
};

const initialState: WaterProjectState = {
  model: loadSavedModel(),
  results: null,
  warnings: [],
  selectedNodeId: null,
  selectedLinkId: null,
  interactionMode: 'select',
  drawStartNode: null,
};

type Action = 
  | { type: 'SET_NODES'; payload: WaterNode[] }
  | { type: 'SET_LINKS'; payload: WaterLink[] }
  | { type: 'UPDATE_NODE_POS'; payload: { id: string; x: number; y: number } }
  | { type: 'SELECT_NODE'; payload: string | null }
  | { type: 'SELECT_LINK'; payload: string | null }
  | { type: 'SET_RESULTS'; payload: any }
  | { type: 'SET_WARNINGS'; payload: any[] }
  | { type: 'SET_INTERACTION_MODE'; payload: 'select' | 'draw_pipe' }
  | { type: 'SET_DRAW_START_NODE'; payload: string | null }
  | { type: 'DELETE_NODE'; payload: string }
  | { type: 'DELETE_LINK'; payload: string }
  | { type: 'CLEAR_NETWORK' };

function reducer(state: WaterProjectState, action: Action): WaterProjectState {
  let newState = state;
  switch (action.type) {
    case 'SET_NODES':
      newState = { ...state, model: { ...state.model, nodes: action.payload } };
      return newState;
    case 'SET_LINKS':
      newState = { ...state, model: { ...state.model, links: action.payload } };
      return newState;
    case 'UPDATE_NODE_POS': {
      const newNodes = state.model.nodes.map(n => 
        n.id === action.payload.id ? { ...n, x: action.payload.x, y: action.payload.y } : n
      );
      newState = { ...state, model: { ...state.model, nodes: newNodes } };
      return newState;
    }
    case 'SELECT_NODE':
      return { ...state, selectedNodeId: action.payload, selectedLinkId: null, interactionMode: 'select', drawStartNode: null };
    case 'SELECT_LINK':
      return { ...state, selectedLinkId: action.payload, selectedNodeId: null, interactionMode: 'select', drawStartNode: null };
    case 'SET_RESULTS':
      return { ...state, results: action.payload };
    case 'SET_WARNINGS':
      return { ...state, warnings: action.payload };
    case 'SET_INTERACTION_MODE':
      return { ...state, interactionMode: action.payload, drawStartNode: null, selectedNodeId: null, selectedLinkId: null };
    case 'SET_DRAW_START_NODE':
      return { ...state, drawStartNode: action.payload };
    case 'DELETE_NODE': {
      const remainingNodes = state.model.nodes.filter(n => n.id !== action.payload);
      const remainingLinks = state.model.links.filter(l => l.startNode !== action.payload && l.endNode !== action.payload);
      return { 
        ...state, 
        model: { ...state.model, nodes: remainingNodes, links: remainingLinks },
        selectedNodeId: state.selectedNodeId === action.payload ? null : state.selectedNodeId
      };
    }
    case 'DELETE_LINK': {
      const remainingLinks = state.model.links.filter(l => l.id !== action.payload);
      return {
        ...state,
        model: { ...state.model, links: remainingLinks },
        selectedLinkId: state.selectedLinkId === action.payload ? null : state.selectedLinkId
      };
    }
    case 'CLEAR_NETWORK':
      return {
        ...state,
        model: { ...state.model, nodes: [], links: [] },
        results: null,
        warnings: [],
        selectedNodeId: null,
        selectedLinkId: null,
        interactionMode: 'select',
        drawStartNode: null
      };
    default:
      return state;
  }
}

interface WaterContextType {
  state: WaterProjectState;
  dispatch: React.Dispatch<Action>;
}

const WaterContext = createContext<WaterContextType | undefined>(undefined);

export function WaterProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.model));
  }, [state.model]);

  return (
    <WaterContext.Provider value={{ state, dispatch }}>
      {children}
    </WaterContext.Provider>
  );
}

export function useWaterContext() {
  const context = useContext(WaterContext);
  if (!context) throw new Error('useWaterContext must be used within WaterProvider');
  return context;
}
