import type { WaterNetworkModel, Pipe, WaterLink } from '../../../types/water';
import { EpanetEngine } from './EpanetEngine';
import type { HydraulicCriteria } from './EpanetEngine';

const STANDARD_DIAMETERS = [50, 75, 90, 110, 160, 200, 250, 315, 400, 500, 630];

export class AutoSizer {
  private getNextLargerDiameter(currentDia: number): number {
    for (const d of STANDARD_DIAMETERS) {
      if (d > currentDia) return d;
    }
    return currentDia; // maxed out
  }

  public async designNetwork(
    initialModel: WaterNetworkModel, 
    criteria: HydraulicCriteria,
    maxIterations: number = 10
  ): Promise<{ model: WaterNetworkModel; iterations: number }> {
    
    // Validate network before starting
    const engine = new EpanetEngine();
    const issues = engine.validateNetwork(initialModel);
    if (issues.length > 0) {
      throw new Error(`Invalid Network Topology:\n${issues.map(i => `• ${i.message}`).join('\n')}`);
    }

    let currentModel: WaterNetworkModel = JSON.parse(JSON.stringify(initialModel));
    let iter = 0;
    
    while (iter < maxIterations) {
      iter++;
      let needsUpgrade = false;
      const results = await engine.runSimulation(currentModel);
      
      if (!results.converged) {
        throw new Error(`Simulation failed to converge during auto-size iteration ${iter}`);
      }

      const upgradedLinks: string[] = [];

      // Check velocities and headloss
      currentModel.links.forEach(l => {
        if (l.type === 'Pipe') {
          const res = results.links[l.id];
          if (res) {
            const p = l as Pipe;
            if (Math.abs(res.velocity) > criteria.maxVelocity || Math.abs(res.headloss) > criteria.maxHeadloss) {
              const newDia = this.getNextLargerDiameter(p.diameter);
              if (newDia > p.diameter) {
                p.diameter = newDia;
                needsUpgrade = true;
                upgradedLinks.push(l.id);
              }
            }
          }
        }
      });

      // Simple heuristic for low pressure: upsize all pipes connected to that node
      const lowPressureNodes = Object.values(results.nodes).filter(n => n.pressure < criteria.minPressure);
      if (lowPressureNodes.length > 0) {
        lowPressureNodes.forEach(n => {
          currentModel.links.forEach(l => {
            if (l.type === 'Pipe' && (l.startNode === n.id || l.endNode === n.id)) {
              if (!upgradedLinks.includes(l.id)) {
                const p = l as Pipe;
                const newDia = this.getNextLargerDiameter(p.diameter);
                if (newDia > p.diameter) {
                  p.diameter = newDia;
                  needsUpgrade = true;
                  upgradedLinks.push(l.id);
                }
              }
            }
          });
        });
      }

      if (!needsUpgrade) {
        // Constraints satisfied!
        return { model: currentModel, iterations: iter };
      }
    }

    throw new Error(`Auto-sizer reached max iterations (${maxIterations}) without meeting constraints. Try manually increasing pipe sizes or adding a pump/reservoir.`);
  }
}
