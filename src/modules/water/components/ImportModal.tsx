import React, { useState } from 'react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (nodes: any[], links: any[]) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [activeTab, setActiveTab] = useState<'nodes' | 'pipes'>('nodes');
  const [inputText, setInputText] = useState('');

  if (!isOpen) return null;

  const handleImport = () => {
    const lines = inputText.split('\n').filter(l => l.trim().length > 0);
    const nodes: any[] = [];
    const links: any[] = [];

    lines.forEach(line => {
      // Split by tab (Excel paste) or comma (CSV)
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      const cleanParts = parts.map(p => p.trim());

      if (activeTab === 'nodes' && cleanParts.length >= 3) {
        // ID, Type (optional, default Junction), Elev, Demand
        const id = cleanParts[0];
        const type = (cleanParts[1].toLowerCase() === 'reservoir' || cleanParts[1].toLowerCase() === 'tank') ? cleanParts[1] : 'Junction';
        const offset = type === 'Junction' ? 0 : -1; // If they didn't provide type and just provided ID, Elev, Demand
        
        let elev, demand;
        if (cleanParts.length === 3) {
          elev = parseFloat(cleanParts[1]);
          demand = parseFloat(cleanParts[2]);
        } else {
          elev = parseFloat(cleanParts[2]);
          demand = parseFloat(cleanParts[3]);
        }

        if (type === 'Junction') {
          nodes.push({ id, type, elevation: elev || 0, baseDemand: demand || 0, x: Math.random()*400 + 100, y: Math.random()*400 + 100 });
        } else {
          nodes.push({ id, type, elevation: elev || 0, totalHead: demand || elev, x: Math.random()*400 + 100, y: Math.random()*400 + 100 });
        }
      } else if (activeTab === 'pipes' && cleanParts.length >= 4) {
        // ID, StartNode, EndNode, Length, Diameter, Roughness
        const id = cleanParts[0];
        const startNode = cleanParts[1];
        const endNode = cleanParts[2];
        const length = parseFloat(cleanParts[3]);
        const diameter = cleanParts.length > 4 ? parseFloat(cleanParts[4]) : 150;
        const roughness = cleanParts.length > 5 ? parseFloat(cleanParts[5]) : 130;

        links.push({
          id, type: 'Pipe', startNode, endNode, length: length || 100, diameter: diameter || 150, roughness: roughness || 130, status: 'Open'
        });
      }
    });

    onImport(nodes, links);
    setInputText('');
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div className="card" style={{ width: '600px', backgroundColor: 'var(--surface-color)', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>Bulk Import Data</h2>
          <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }} onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)' }}>
          <button 
            style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'nodes' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'nodes' ? 'var(--color-primary)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: activeTab === 'nodes' ? 'bold' : 'normal' }}
            onClick={() => setActiveTab('nodes')}
          >
            Import Nodes
          </button>
          <button 
            style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'pipes' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'pipes' ? 'var(--color-primary)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: activeTab === 'pipes' ? 'bold' : 'normal' }}
            onClick={() => setActiveTab('pipes')}
          >
            Import Pipes
          </button>
        </div>

        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          {activeTab === 'nodes' 
            ? 'Paste data from Excel. Expected columns: ID, Type (optional), Elevation (m), Demand/Head.' 
            : 'Paste data from Excel. Expected columns: ID, Start Node, End Node, Length (m), Diameter (mm), Roughness.'}
        </p>

        <textarea 
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder={`Paste your tabular data here...\nRow 1\nRow 2`}
          style={{ width: '100%', height: '200px', padding: '0.5rem', fontFamily: 'monospace', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'var(--bg-color)', color: 'var(--text-primary)', resize: 'vertical' }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleImport} disabled={!inputText.trim()}>Import</button>
        </div>
      </div>
    </div>
  );
}
