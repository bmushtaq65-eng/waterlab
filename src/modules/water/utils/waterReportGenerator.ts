import type { WaterProjectState, Junction, Pipe } from '../../../types/water';

export function generateWaterReport(state: WaterProjectState): string {
  const { model, results, warnings } = state;

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Water Network Design Report</title>
      <style>
        body { font-family: 'Inter', system-ui, sans-serif; line-height: 1.5; color: #111827; max-width: 1000px; margin: 0 auto; padding: 2rem; }
        .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1e40af; padding-bottom: 1rem; margin-bottom: 2rem; }
        .logo { font-size: 2rem; font-weight: 900; color: #1e40af; letter-spacing: -1px; }
        .subtitle { color: #6b7280; font-size: 0.875rem; }
        h1, h2, h3 { color: #1e40af; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; font-size: 0.875rem; }
        th, td { border: 1px solid #e5e7eb; padding: 0.5rem; text-align: left; }
        th { background-color: #f3f4f6; font-weight: 600; }
        .warning { color: #d97706; font-weight: bold; }
        .danger { color: #dc2626; font-weight: bold; }
        .success { color: #059669; font-weight: bold; }
        .summary-box { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 1rem; border-radius: 4px; margin-bottom: 2rem; }
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
        @media print {
          body { padding: 0; }
          .page-break { page-break-before: always; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo">BEAMLAB WATER</div>
          <div class="subtitle">Hydraulic Network Analysis Report</div>
        </div>
        <div style="text-align: right">
          <div>Date: ${new Date().toLocaleDateString()}</div>
          <div>Method: ${model.hydraulicMethod}</div>
        </div>
      </div>

      <h2>1. Project Summary</h2>
      <div class="summary-box">
        <div class="grid">
          <div>
            <strong>Network Topology</strong><br/>
            Total Nodes: ${model.nodes.length}<br/>
            Total Links: ${model.links.length}<br/>
          </div>
          <div>
            <strong>Hydraulic Results</strong><br/>
            Status: <span class="${results?.converged ? 'success' : 'danger'}">${results ? (results.converged ? 'Successfully Converged' : 'Failed to Converge') : 'Not Analyzed'}</span><br/>
            ${results ? `
              Total Supply: ${results.totalSupply.toFixed(2)} L/s<br/>
              Total Demand: ${results.totalDemand.toFixed(2)} L/s
            ` : ''}
          </div>
        </div>
      </div>
  `;

  if (warnings.length > 0) {
    html += `
      <h2>2. Design Warnings</h2>
      <table>
        <tr><th>Element ID</th><th>Type</th><th>Message</th></tr>
        ${warnings.map(w => `
          <tr>
            <td>${w.id}</td>
            <td class="${w.level === 'Critical' ? 'danger' : 'warning'}">${w.type}</td>
            <td>${w.message}</td>
          </tr>
        `).join('')}
      </table>
    `;
  }

  html += `
      <h2 class="${warnings.length > 0 ? 'page-break' : ''}">3. Node Results</h2>
      <table>
        <tr>
          <th>ID</th>
          <th>Type</th>
          <th>Elev (m)</th>
          <th>Demand (L/s)</th>
          <th>Head (m)</th>
          <th>Pressure (m)</th>
        </tr>
  `;

  model.nodes.forEach(n => {
    let demand = n.type === 'Junction' ? (n as Junction).baseDemand.toString() : '-';
    let head = '-';
    let pressure = '-';
    let pressureClass = '';

    if (results?.nodes[n.id]) {
      const res = results.nodes[n.id];
      head = res.head.toFixed(2);
      pressure = res.pressure.toFixed(2);
      if (res.pressure < 15) pressureClass = 'warning';
      if (res.pressure < 0) pressureClass = 'danger';
      if (res.pressure > 100) pressureClass = 'warning';
    }

    html += `
        <tr>
          <td>${n.id}</td>
          <td>${n.type}</td>
          <td>${n.elevation.toFixed(2)}</td>
          <td>${demand}</td>
          <td>${head}</td>
          <td class="${pressureClass}">${pressure}</td>
        </tr>
    `;
  });

  html += `
      </table>

      <h2 class="page-break">4. Pipe Results</h2>
      <table>
        <tr>
          <th>ID</th>
          <th>Length (m)</th>
          <th>Diameter (mm)</th>
          <th>Flow (L/s)</th>
          <th>Velocity (m/s)</th>
          <th>Headloss (m)</th>
        </tr>
  `;

  model.links.forEach(l => {
    if (l.type === 'Pipe') {
      const p = l as Pipe;
      let flow = '-';
      let velocity = '-';
      let headloss = '-';
      let velocityClass = '';

      if (results?.links[l.id]) {
        const res = results.links[l.id];
        flow = res.flow.toFixed(2);
        velocity = res.velocity.toFixed(2);
        headloss = res.headloss.toFixed(2);
        if (Math.abs(res.velocity) > 2.0) velocityClass = 'danger';
      }

      html += `
        <tr>
          <td>${p.id}</td>
          <td>${p.length.toFixed(2)}</td>
          <td>${p.diameter.toFixed(2)}</td>
          <td>${flow}</td>
          <td class="${velocityClass}">${velocity}</td>
          <td>${headloss}</td>
        </tr>
      `;
    }
  });

  html += `
      </table>
      
      <div style="margin-top: 4rem; padding-top: 1rem; border-top: 1px solid #ccc; font-size: 0.75rem; color: #666; text-align: center;">
        Generated by BEAMLAB Water Network Module.<br/>
        Disclaimer: Results are intended for preliminary engineering analysis and should be independently verified before use in safety-critical applications.
      </div>
    </body>
    </html>
  `;

  return html;
}

export function openWaterReport(html: string) {
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 500);
  }
}
