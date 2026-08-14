import { Workspace, Project } from 'epanet-js';
import type {
  WaterNetworkModel,
  HydraulicResults,
  SimulationWarning,
  NodeResult,
  LinkResult,
  Junction,
  Reservoir,
  Tank,
  Pipe,
  Pump,
  Valve,
  WaterNode,
  WaterLink
} from '../../../types/water';

export interface HydraulicCriteria {
  minPressure: number;
  maxPressure: number;
  maxVelocity: number;
  maxHeadloss: number;
}

export interface NetworkIssue {
  type: 'NoNodes' | 'NoLinks' | 'NoSource' | 'IsolatedNode' | 'InvalidLink';
  nodeId?: string;
  linkId?: string;
  message: string;
}

export class EpanetEngine {
  private generateInp(model: WaterNetworkModel): string {
    let inp = `[TITLE]\nBEAMLAB Water Network\n\n`;

    // JUNCTIONS
    inp += `[JUNCTIONS]\n;ID\tElev\tDemand\tPattern\n`;
    model.nodes.filter(n => n.type === 'Junction').forEach(n => {
      const j = n as Junction;
      inp += `${j.id}\t${j.elevation}\t${j.baseDemand}\t${j.demandPattern || ''}\n`;
    });
    inp += '\n';

    // RESERVOIRS
    inp += `[RESERVOIRS]\n;ID\tHead\tPattern\n`;
    model.nodes.filter(n => n.type === 'Reservoir').forEach(n => {
      const r = n as Reservoir;
      inp += `${r.id}\t${r.totalHead}\t\n`;
    });
    inp += '\n';

    // TANKS
    inp += `[TANKS]\n;ID\tElevation\tInitLevel\tMinLevel\tMaxLevel\tDiameter\tMinVol\tVolCurve\n`;
    model.nodes.filter(n => n.type === 'Tank').forEach(n => {
      const t = n as Tank;
      inp += `${t.id}\t${t.elevation}\t${t.initialLevel}\t${t.minLevel}\t${t.maxLevel}\t${t.diameter}\t\t\n`;
    });
    inp += '\n';

    // PIPES
    inp += `[PIPES]\n;ID\tNode1\tNode2\tLength\tDiameter\tRoughness\tMinorLoss\tStatus\n`;
    model.links.filter(l => l.type === 'Pipe').forEach(l => {
      const p = l as Pipe;
      inp += `${p.id}\t${p.startNode}\t${p.endNode}\t${p.length}\t${p.diameter}\t${p.roughness}\t${p.minorLoss || 0}\t${p.status}\n`;
    });
    inp += '\n';

    // PUMPS
    inp += `[PUMPS]\n;ID\tNode1\tNode2\tParameters\n`;
    model.links.filter(l => l.type === 'Pump').forEach(l => {
      const p = l as Pump;
      if (p.pumpCurve) {
        inp += `${p.id}\t${p.startNode}\t${p.endNode}\tHEAD ${p.pumpCurve}\n`;
      } else if (p.designFlow && p.designHead) {
        // Dummy way or custom
        inp += `${p.id}\t${p.startNode}\t${p.endNode}\tPOWER 10\n`; 
      }
    });
    inp += '\n';

    // VALVES
    inp += `[VALVES]\n;ID\tNode1\tNode2\tDiameter\tType\tSetting\tMinorLoss\n`;
    model.links.filter(l => l.type === 'Valve').forEach(l => {
      const v = l as Valve;
      inp += `${v.id}\t${v.startNode}\t${v.endNode}\t100\t${v.valveType}\t${v.setting}\t0\n`;
    });
    inp += '\n';

    // OPTIONS
    inp += `[OPTIONS]\nUNITS LPS\nHEADLOSS ${model.hydraulicMethod}\n\n`;

    // END
    inp += `[END]\n`;
    return inp;
  }

  /**
   * Checks a model for problems EPANET cannot handle (unconnected nodes, missing
   * source, links to non-existent nodes) so the user gets a clear message instead
   * of a cryptic EPANET error code.
   */
  public validateNetwork(model: WaterNetworkModel): NetworkIssue[] {
    const issues: NetworkIssue[] = [];

    if (model.nodes.length === 0) {
      issues.push({
        type: 'NoNodes',
        message: 'The network has no nodes. Add a reservoir and some junctions first.',
      });
      return issues;
    }

    if (model.links.length === 0) {
      issues.push({
        type: 'NoLinks',
        message: 'The network has no pipes. Use "+ Draw Pipe" to connect the nodes.',
      });
      return issues;
    }

    const hasSource = model.nodes.some(n => n.type === 'Reservoir' || n.type === 'Tank');
    if (!hasSource) {
      issues.push({
        type: 'NoSource',
        message: 'The network has no reservoir or tank. Add one to supply water to the system.',
      });
    }

    const nodeIds = new Set<string>();
    const seenIds = new Map<string, number>();
    model.nodes.forEach((n, i) => {
      const count = seenIds.get(n.id) || 0;
      if (count > 0) {
        issues.push({
          type: 'InvalidLink' as const,
          nodeId: n.id,
          message: `Duplicate node ID "${n.id}" found. Rename one of them to a unique ID.`,
        });
      }
      seenIds.set(n.id, count + 1);
      nodeIds.add(n.id);
    });
    // If there are duplicate IDs, stop — EPANET cannot handle them
    if (issues.length > 0) return issues;

    const connectedNodeIds = new Set<string>();
    const seenLinkIds = new Map<string, boolean>();

    model.links.forEach(l => {
      if (seenLinkIds.has(l.id)) {
        issues.push({
          type: 'InvalidLink' as const,
          linkId: l.id,
          message: `Duplicate pipe ID "${l.id}". Rename it to a unique ID.`,
        });
        return;
      }
      seenLinkIds.set(l.id, true);
      if (!nodeIds.has(l.startNode) || !nodeIds.has(l.endNode)) {
        issues.push({
          type: 'InvalidLink',
          linkId: l.id,
          message: `Pipe ${l.id} connects to a node that does not exist (${l.startNode} → ${l.endNode}). Fix or delete this pipe.`,
        });
        return;
      }
      connectedNodeIds.add(l.startNode);
      connectedNodeIds.add(l.endNode);
    });

    model.nodes.forEach(n => {
      if (!connectedNodeIds.has(n.id)) {
        issues.push({
          type: 'IsolatedNode',
          nodeId: n.id,
          message: `Node ${n.id} is not connected to any pipe. Connect it with "+ Draw Pipe" or delete it.`,
        });
      }
    });

    return issues;
  }

  public async runSimulation(model: WaterNetworkModel): Promise<HydraulicResults> {
    const ws = new Workspace();
    const inpStr = this.generateInp(model);

    // EPANET's WebAssembly engine must be loaded before the workspace can be used
    await ws.loadModule();

    ws.writeFile('net.inp', inpStr);
    
    const project = new Project(ws);
    
    // Default empty results if fails
    const results: HydraulicResults = {
      nodes: {},
      links: {},
      totalDemand: 0,
      totalSupply: 0,
      maxPressure: 0,
      minPressure: 0,
      maxVelocity: 0,
      maxHeadloss: 0,
      balanceError: 0,
      converged: false,
      iterations: 0
    };

    try {
      project.open('net.inp', 'net.rpt', 'net.out');
      project.solveH(); // Solve hydraulic

      // Extract node results
      model.nodes.forEach(n => {
        const index = project.getNodeIndex(n.id);
        const head = project.getNodeValue(index, 10); // EN_HEAD
        const pressure = project.getNodeValue(index, 11); // EN_PRESSURE
        const demand = project.getNodeValue(index, 9); // EN_DEMAND

        results.nodes[n.id] = {
          id: n.id,
          demand,
          head,
          pressure
        };

        if (n.type === 'Junction') {
          results.totalDemand += Math.max(0, demand);
        } else {
          results.totalSupply += Math.abs(Math.min(0, demand)); // reservoirs supply usually shows as negative demand
        }

        if (pressure > results.maxPressure) results.maxPressure = pressure;
        if (pressure < results.minPressure || results.minPressure === 0) results.minPressure = pressure;
      });

      // Extract link results
      model.links.forEach(l => {
        const index = project.getLinkIndex(l.id);
        const flow = project.getLinkValue(index, 8); // EN_FLOW
        const velocity = project.getLinkValue(index, 9); // EN_VELOCITY
        const headloss = project.getLinkValue(index, 10); // EN_HEADLOSS
        const statusVal = project.getLinkValue(index, 11); // EN_STATUS

        results.links[l.id] = {
          id: l.id,
          flow,
          velocity,
          headloss,
          status: statusVal > 0 ? 'Open' : 'Closed'
        };

        if (Math.abs(velocity) > results.maxVelocity) results.maxVelocity = Math.abs(velocity);
        if (Math.abs(headloss) > results.maxHeadloss) results.maxHeadloss = Math.abs(headloss);
      });

      results.converged = true;
      project.close();
    } catch (error: any) {
      console.error('EPANET Simulation failed:', error);
      throw error;
    }

    return results;
  }

  public generateWarnings(results: HydraulicResults, criteria: HydraulicCriteria): SimulationWarning[] {
    const warnings: SimulationWarning[] = [];

    if (!results.converged) {
       warnings.push({
         id: 'system',
         type: 'Disconnected',
         message: 'Hydraulic simulation failed to converge.',
         level: 'Critical'
       });
       return warnings;
    }

    // Node warnings
    Object.values(results.nodes).forEach(n => {
      if (n.pressure < 0) {
        warnings.push({
          id: n.id,
          type: 'NegativePressure',
          message: `Node ${n.id} has negative pressure (${n.pressure.toFixed(2)} m).`,
          level: 'Critical'
        });
      } else if (n.pressure < criteria.minPressure) {
        warnings.push({
          id: n.id,
          type: 'LowPressure',
          message: `Node ${n.id} has low pressure (${n.pressure.toFixed(2)} m).`,
          level: 'Warning'
        });
      } else if (n.pressure > criteria.maxPressure) {
        warnings.push({
          id: n.id,
          type: 'HighPressure',
          message: `Node ${n.id} has high pressure (${n.pressure.toFixed(2)} m).`,
          level: 'Warning'
        });
      }
    });

    // Link warnings
    Object.values(results.links).forEach(l => {
      if (Math.abs(l.velocity) > criteria.maxVelocity) {
        warnings.push({
          id: l.id,
          type: 'HighVelocity',
          message: `Link ${l.id} has high velocity (${l.velocity.toFixed(2)} m/s).`,
          level: 'Warning'
        });
      }
      if (Math.abs(l.headloss) > criteria.maxHeadloss) {
        warnings.push({
          id: l.id,
          type: 'HighHeadloss',
          message: `Link ${l.id} has high headloss (${l.headloss.toFixed(2)} m).`,
          level: 'Warning'
        });
      }
    });

    return warnings;
  }
}
