import * as XLSX from 'xlsx';
import type { WaterProjectState, Junction, Reservoir, Tank, Pipe, Pump, Valve } from '../../../types/water';

export function exportProjectToExcel(state: WaterProjectState): Uint8Array {
  const wb = XLSX.utils.book_new();
  
  const { model, results, warnings } = state;

  // 1. Summary
  const summaryData = [
    { Property: 'Total Nodes', Value: model.nodes.length },
    { Property: 'Total Links', Value: model.links.length },
    { Property: 'Hydraulic Method', Value: model.hydraulicMethod },
    { Property: 'Converged', Value: results?.converged ? 'Yes' : 'No' },
    { Property: 'Total Warnings', Value: warnings.length }
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), 'Summary');

  // 2. Options
  const optionsData = [
    { Option: 'HEADLOSS', Value: model.hydraulicMethod }
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(optionsData), 'Options');

  // 3. Junctions
  const junctions = model.nodes.filter(n => n.type === 'Junction').map(n => {
    const j = n as Junction;
    return { ID: j.id, Elevation: j.elevation, Demand: j.baseDemand, Pattern: j.demandPattern || '', X: j.x || '', Y: j.y || '' };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(junctions), 'Junctions');

  // 4. Reservoirs
  const reservoirs = model.nodes.filter(n => n.type === 'Reservoir').map(n => {
    const r = n as Reservoir;
    return { ID: r.id, Elevation: r.elevation, Head: r.totalHead, X: r.x || '', Y: r.y || '' };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reservoirs), 'Reservoirs');

  // 5. Tanks
  const tanks = model.nodes.filter(n => n.type === 'Tank').map(n => {
    const t = n as Tank;
    return { ID: t.id, Elevation: t.elevation, InitLevel: t.initialLevel, MinLevel: t.minLevel, MaxLevel: t.maxLevel, Diameter: t.diameter, X: t.x || '', Y: t.y || '' };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tanks), 'Tanks');

  // 6. Pipes
  const pipes = model.links.filter(l => l.type === 'Pipe').map(l => {
    const p = l as Pipe;
    return { ID: p.id, Node1: p.startNode, Node2: p.endNode, Length: p.length, Diameter: p.diameter, Roughness: p.roughness, MinorLoss: p.minorLoss || 0, Status: p.status };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pipes), 'Pipes');

  // 7. Pumps
  const pumps = model.links.filter(l => l.type === 'Pump').map(l => {
    const p = l as Pump;
    return { ID: p.id, Node1: p.startNode, Node2: p.endNode, Curve: p.pumpCurve || '', DesignFlow: p.designFlow || '', DesignHead: p.designHead || '', Status: p.status };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pumps), 'Pumps');

  // 8. Valves
  const valves = model.links.filter(l => l.type === 'Valve').map(l => {
    const v = l as Valve;
    return { ID: v.id, Node1: v.startNode, Node2: v.endNode, Type: v.valveType, Setting: v.setting, Status: v.status };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(valves), 'Valves');

  // 9. Node Results
  if (results) {
    const nodeResults = Object.values(results.nodes).map(nr => ({
      ID: nr.id, Demand: nr.demand, Head: nr.head, Pressure: nr.pressure
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(nodeResults), 'Node Results');
  } else {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([]), 'Node Results');
  }

  // 10. Link Results
  if (results) {
    const linkResults = Object.values(results.links).map(lr => ({
      ID: lr.id, Flow: lr.flow, Velocity: lr.velocity, Headloss: lr.headloss, Status: lr.status
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linkResults), 'Link Results');
  } else {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([]), 'Link Results');
  }

  // 11. Warnings
  const warningsData = warnings.map(w => ({
    ID: w.id, Type: w.type, Message: w.message, Level: w.level
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(warningsData), 'Warnings');

  // 12. System Results
  if (results) {
    const systemResults = [
      { Metric: 'Total Demand', Value: results.totalDemand },
      { Metric: 'Total Supply', Value: results.totalSupply },
      { Metric: 'Max Pressure', Value: results.maxPressure },
      { Metric: 'Min Pressure', Value: results.minPressure },
      { Metric: 'Max Velocity', Value: results.maxVelocity },
      { Metric: 'Max Headloss', Value: results.maxHeadloss },
      { Metric: 'Iterations', Value: results.iterations },
      { Metric: 'Balance Error', Value: results.balanceError }
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(systemResults), 'System Results');
  } else {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([]), 'System Results');
  }

  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as Uint8Array;
}
