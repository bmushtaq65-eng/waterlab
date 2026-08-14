import * as XLSX from 'xlsx';
import type { WaterNetworkModel, Junction, Reservoir, Tank, Pipe, Pump, Valve, WaterNode, WaterLink } from '../../../types/water';

export function parseExcelToModel(buffer: ArrayBuffer): WaterNetworkModel {
  const wb = XLSX.read(buffer, { type: 'array' });

  const model: WaterNetworkModel = {
    nodes: [],
    links: [],
    hydraulicMethod: 'H-W'
  };

  // Junctions
  if (wb.Sheets['Junctions']) {
    const data = XLSX.utils.sheet_to_json(wb.Sheets['Junctions']) as any[];
    data.forEach(row => {
      model.nodes.push({
        id: String(row['ID']),
        type: 'Junction',
        elevation: Number(row['Elevation'] || 0),
        baseDemand: Number(row['Demand'] || 0),
        demandPattern: row['Pattern'] ? String(row['Pattern']) : undefined,
        x: row['X'] ? Number(row['X']) : undefined,
        y: row['Y'] ? Number(row['Y']) : undefined
      } as Junction);
    });
  }

  // Reservoirs
  if (wb.Sheets['Reservoirs']) {
    const data = XLSX.utils.sheet_to_json(wb.Sheets['Reservoirs']) as any[];
    data.forEach(row => {
      model.nodes.push({
        id: String(row['ID']),
        type: 'Reservoir',
        elevation: Number(row['Elevation'] || 0),
        totalHead: Number(row['Head'] || 0),
        x: row['X'] ? Number(row['X']) : undefined,
        y: row['Y'] ? Number(row['Y']) : undefined
      } as Reservoir);
    });
  }

  // Tanks
  if (wb.Sheets['Tanks']) {
    const data = XLSX.utils.sheet_to_json(wb.Sheets['Tanks']) as any[];
    data.forEach(row => {
      model.nodes.push({
        id: String(row['ID']),
        type: 'Tank',
        elevation: Number(row['Elevation'] || 0),
        initialLevel: Number(row['InitLevel'] || 0),
        minLevel: Number(row['MinLevel'] || 0),
        maxLevel: Number(row['MaxLevel'] || 0),
        diameter: Number(row['Diameter'] || 0),
        x: row['X'] ? Number(row['X']) : undefined,
        y: row['Y'] ? Number(row['Y']) : undefined
      } as Tank);
    });
  }

  // Pipes
  if (wb.Sheets['Pipes']) {
    const data = XLSX.utils.sheet_to_json(wb.Sheets['Pipes']) as any[];
    data.forEach(row => {
      model.links.push({
        id: String(row['ID']),
        type: 'Pipe',
        startNode: String(row['Node1']),
        endNode: String(row['Node2']),
        length: Number(row['Length'] || 100),
        diameter: Number(row['Diameter'] || 100),
        roughness: Number(row['Roughness'] || 100),
        minorLoss: Number(row['MinorLoss'] || 0),
        status: row['Status'] === 'Closed' ? 'Closed' : 'Open'
      } as Pipe);
    });
  }

  // Pumps
  if (wb.Sheets['Pumps']) {
    const data = XLSX.utils.sheet_to_json(wb.Sheets['Pumps']) as any[];
    data.forEach(row => {
      model.links.push({
        id: String(row['ID']),
        type: 'Pump',
        startNode: String(row['Node1']),
        endNode: String(row['Node2']),
        pumpCurve: row['Curve'] ? String(row['Curve']) : undefined,
        designFlow: row['DesignFlow'] ? Number(row['DesignFlow']) : undefined,
        designHead: row['DesignHead'] ? Number(row['DesignHead']) : undefined,
        status: row['Status'] === 'Closed' ? 'Closed' : 'Open'
      } as Pump);
    });
  }

  // Valves
  if (wb.Sheets['Valves']) {
    const data = XLSX.utils.sheet_to_json(wb.Sheets['Valves']) as any[];
    data.forEach(row => {
      model.links.push({
        id: String(row['ID']),
        type: 'Valve',
        startNode: String(row['Node1']),
        endNode: String(row['Node2']),
        valveType: String(row['Type'] || 'PRV') as any,
        setting: Number(row['Setting'] || 0),
        status: row['Status'] === 'Closed' ? 'Closed' : 'Open'
      } as Valve);
    });
  }

  // Options
  if (wb.Sheets['Options']) {
    const data = XLSX.utils.sheet_to_json(wb.Sheets['Options']) as any[];
    data.forEach(row => {
      if (row['Option'] === 'Hydraulic Method' || row['Option'] === 'HEADLOSS') {
        const val = String(row['Value']).toUpperCase();
        if (['H-W', 'D-W', 'C-M'].includes(val)) {
          model.hydraulicMethod = val as any;
        }
      }
    });
  }

  return model;
}
