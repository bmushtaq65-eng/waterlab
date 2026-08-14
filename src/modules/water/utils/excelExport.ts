import * as XLSX from 'xlsx';
import type { WaterProjectState, Junction, Pipe } from '../../../types/water';

export function exportWaterNetworkToExcel(state: WaterProjectState) {
  const { model, results } = state;

  // Sheet 1: Project Summary
  const summaryData = [
    ['BEAMLAB WATER NETWORK DESIGN - EXCEL EXPORT'],
    ['Export Date', new Date().toLocaleString()],
    ['Total Nodes', model.nodes.length],
    ['Total Links', model.links.length],
    ['Analysis Status', results ? 'Calculated' : 'Not Calculated'],
    [],
    ['Hydraulic Method', model.hydraulicMethod],
  ];
  if (results) {
    summaryData.push(
      ['Total Demand (L/s)', results.totalDemand.toFixed(2)],
      ['Total Supply (L/s)', results.totalSupply.toFixed(2)],
      ['Max Pressure (m)', results.maxPressure.toFixed(2)],
      ['Min Pressure (m)', results.minPressure.toFixed(2)],
      ['Max Velocity (m/s)', results.maxVelocity.toFixed(2)],
      ['Max Headloss (m)', results.maxHeadloss.toFixed(2)]
    );
  }

  // Sheet 2: Nodes Data
  const nodesData = [['ID', 'Type', 'Elevation (m)', 'Base Demand (L/s)', 'Total Head (m)', 'Pressure (m)', 'Calculated Head (m)']];
  model.nodes.forEach(n => {
    let demand = '';
    let totHead = '';
    if (n.type === 'Junction') demand = (n as Junction).baseDemand.toString();
    if (n.type === 'Reservoir') totHead = (n as any).totalHead.toString();
    
    let calcPres = '';
    let calcHead = '';
    if (results?.nodes[n.id]) {
      calcPres = results.nodes[n.id].pressure.toFixed(2);
      calcHead = results.nodes[n.id].head.toFixed(2);
    }
    
    nodesData.push([
      n.id, n.type, n.elevation.toString(), demand, totHead, calcPres, calcHead
    ]);
  });

  // Sheet 3: Links Data
  const linksData = [['ID', 'Type', 'Start Node', 'End Node', 'Length (m)', 'Diameter (mm)', 'Roughness', 'Flow (L/s)', 'Velocity (m/s)', 'Headloss (m)']];
  model.links.forEach(l => {
    let len = '';
    let dia = '';
    let rough = '';
    if (l.type === 'Pipe') {
      const p = l as Pipe;
      len = p.length.toString();
      dia = p.diameter.toString();
      rough = p.roughness.toString();
    }
    
    let calcFlow = '';
    let calcVel = '';
    let calcHeadloss = '';
    if (results?.links[l.id]) {
      calcFlow = results.links[l.id].flow.toFixed(2);
      calcVel = results.links[l.id].velocity.toFixed(2);
      calcHeadloss = results.links[l.id].headloss.toFixed(2);
    }

    linksData.push([
      l.id, l.type, l.startNode, l.endNode, len, dia, rough, calcFlow, calcVel, calcHeadloss
    ]);
  });

  // Create workbook
  const wb = XLSX.utils.book_new();
  
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
  
  const wsNodes = XLSX.utils.aoa_to_sheet(nodesData);
  XLSX.utils.book_append_sheet(wb, wsNodes, "Nodes");
  
  const wsLinks = XLSX.utils.aoa_to_sheet(linksData);
  XLSX.utils.book_append_sheet(wb, wsLinks, "Links");

  // Save file
  XLSX.writeFile(wb, "Beamlab_Water_Network.xlsx");
}
