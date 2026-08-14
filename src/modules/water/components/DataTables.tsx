import React, { useState } from 'react';
import { useWaterContext } from '../context/WaterContext';
import type { WaterNode, WaterLink, Junction, Pipe } from '../../../types/water';

export function DataTables() {
  const { state, dispatch } = useWaterContext();
  const [activeTab, setActiveTab] = useState<'nodes' | 'links'>('nodes');

  const handlePasteNodes = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const rows = text.split('\n').filter(r => r.trim() !== '');
      const newNodes: WaterNode[] = rows.map((row, i) => {
        const cols = row.split('\t');
        return {
          id: cols[0] || `J-${i}`,
          type: 'Junction',
          elevation: parseFloat(cols[1]) || 0,
          baseDemand: parseFloat(cols[2]) || 0,
        } as Junction;
      });
      dispatch({ type: 'SET_NODES', payload: newNodes });
    } catch (err) {
      console.error('Failed to paste', err);
    }
  };

  const handlePasteLinks = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const rows = text.split('\n').filter(r => r.trim() !== '');
      const newLinks: WaterLink[] = rows.map((row, i) => {
        const cols = row.split('\t');
        return {
          id: cols[0] || `P-${i}`,
          type: 'Pipe',
          startNode: cols[1] || '',
          endNode: cols[2] || '',
          length: parseFloat(cols[3]) || 100,
          diameter: parseFloat(cols[4]) || 150,
          roughness: parseFloat(cols[5]) || 100,
          status: 'Open',
        } as Pipe;
      });
      dispatch({ type: 'SET_LINKS', payload: newLinks });
    } catch (err) {
      console.error('Failed to paste', err);
    }
  };

  const addNode = (type: 'Junction' | 'Reservoir') => {
    // Pick a unique suffix so IDs never collide after clear-and-rebuild
    let maxNum = 0;
    state.model.nodes.forEach(n => {
      const m = n.id.match(/(\d+)$/);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1]));
    });
    const id = `${type.charAt(0)}-${maxNum + 1}`;
    const newNode: WaterNode = type === 'Junction' 
      ? { id, type, elevation: 0, baseDemand: 0 } as Junction
      : { id, type, elevation: 100, totalHead: 100 } as any;
    dispatch({ type: 'SET_NODES', payload: [...state.model.nodes, newNode] });
  };

  const addLink = () => {
    let maxNum = 0;
    state.model.links.forEach(l => {
      const m = l.id.match(/(\d+)$/);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1]));
    });
    const id = `P-${maxNum + 1}`;
    const newLink: Pipe = { id, type: 'Pipe', startNode: '', endNode: '', length: 100, diameter: 150, roughness: 130, status: 'Open' } as Pipe;
    dispatch({ type: 'SET_LINKS', payload: [...state.model.links, newLink] });
  };

  const updateNode = (index: number, field: string, value: any) => {
    const newNodes = [...state.model.nodes];
    newNodes[index] = { ...newNodes[index], [field]: value } as WaterNode;
    dispatch({ type: 'SET_NODES', payload: newNodes });
  };

  const updateLink = (index: number, field: string, value: any) => {
    const newLinks = [...state.model.links];
    newLinks[index] = { ...newLinks[index], [field]: value } as WaterLink;
    dispatch({ type: 'SET_LINKS', payload: newLinks });
  };

  return (
    <div className="data-tables-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      <div className="tabs" style={{ display: 'flex', gap: '1rem' }}>
        <button 
          className={`btn ${activeTab === 'nodes' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('nodes')}
        >
          Nodes
        </button>
        <button 
          className={`btn ${activeTab === 'links' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('links')}
        >
          Links
        </button>
      </div>

      <div className="table-wrapper" style={{ flex: 1, backgroundColor: 'var(--surface-color)', border: '1px solid var(--color-border)', borderRadius: '4px', overflow: 'auto' }}>
        {activeTab === 'nodes' ? (
          <div>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-outline" onClick={handlePasteNodes}>Paste from Excel</button>
              <button className="btn btn-outline" onClick={() => addNode('Junction')}>+ Add Junction</button>
              <button className="btn btn-outline" onClick={() => addNode('Reservoir')}>+ Add Reservoir</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--surface-color-alt)' }}>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>ID</th>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>Type</th>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>Elevation</th>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>Demand / Head</th>
                </tr>
              </thead>
              <tbody>
                {state.model.nodes.map((node, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.5rem' }}>
                      <input type="text" value={node.id} onChange={(e) => updateNode(i, 'id', e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', color: 'inherit' }} />
                    </td>
                    <td style={{ padding: '0.5rem' }}>{node.type}</td>
                    <td style={{ padding: '0.5rem' }}>
                      <input type="number" value={node.elevation} onChange={(e) => updateNode(i, 'elevation', parseFloat(e.target.value))} style={{ width: '100%', background: 'transparent', border: 'none', color: 'inherit' }} />
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      {node.type === 'Junction' ? (
                        <input type="number" value={(node as Junction).baseDemand} onChange={(e) => updateNode(i, 'baseDemand', parseFloat(e.target.value))} style={{ width: '100%', background: 'transparent', border: 'none', color: 'inherit' }} />
                      ) : (
                        <input type="number" value={(node as any).totalHead} onChange={(e) => updateNode(i, 'totalHead', parseFloat(e.target.value))} style={{ width: '100%', background: 'transparent', border: 'none', color: 'inherit' }} />
                      )}
                    </td>
                  </tr>
                ))}
                {state.model.nodes.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No nodes defined.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-outline" onClick={handlePasteLinks}>Paste from Excel</button>
              <button className="btn btn-outline" onClick={addLink}>+ Add Pipe</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--surface-color-alt)' }}>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>ID</th>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>Start</th>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>End</th>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>Length</th>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>Diameter</th>
                </tr>
              </thead>
              <tbody>
                {state.model.links.map((link, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.5rem' }}>
                      <input type="text" value={link.id} onChange={(e) => updateLink(i, 'id', e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', color: 'inherit' }} />
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <input type="text" value={link.startNode} onChange={(e) => updateLink(i, 'startNode', e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', color: 'inherit' }} />
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <input type="text" value={link.endNode} onChange={(e) => updateLink(i, 'endNode', e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', color: 'inherit' }} />
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      {link.type === 'Pipe' ? (
                        <input type="number" value={(link as Pipe).length} onChange={(e) => updateLink(i, 'length', parseFloat(e.target.value))} style={{ width: '100%', background: 'transparent', border: 'none', color: 'inherit' }} />
                      ) : '-'}
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      {link.type === 'Pipe' ? (
                        <input type="number" value={(link as Pipe).diameter} onChange={(e) => updateLink(i, 'diameter', parseFloat(e.target.value))} style={{ width: '100%', background: 'transparent', border: 'none', color: 'inherit' }} />
                      ) : '-'}
                    </td>
                  </tr>
                ))}
                {state.model.links.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No links defined.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
