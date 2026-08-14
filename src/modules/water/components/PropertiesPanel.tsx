import React from 'react';
import { useWaterContext } from '../context/WaterContext';
import type { WaterNode, WaterLink, Junction, Pipe } from '../../../types/water';

export function PropertiesPanel() {
  const { state, dispatch } = useWaterContext();

  const selectedNode = state.selectedNodeId ? state.model.nodes.find(n => n.id === state.selectedNodeId) : null;
  const selectedLink = state.selectedLinkId ? state.model.links.find(l => l.id === state.selectedLinkId) : null;

  const closePanel = () => {
    dispatch({ type: 'SELECT_NODE', payload: null });
    dispatch({ type: 'SELECT_LINK', payload: null });
  };

  const updateNode = (field: string, value: any) => {
    if (!selectedNode) return;
    const newNodes = state.model.nodes.map(n => 
      n.id === selectedNode.id ? { ...n, [field]: value } : n
    ) as WaterNode[];
    dispatch({ type: 'SET_NODES', payload: newNodes });
  };

  const updateLink = (field: string, value: any) => {
    if (!selectedLink) return;
    const newLinks = state.model.links.map(l => 
      l.id === selectedLink.id ? { ...l, [field]: value } : l
    ) as WaterLink[];
    dispatch({ type: 'SET_LINKS', payload: newLinks });
  };

  if (!selectedNode && !selectedLink) return null;

  return (
    <div className="properties-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--surface-color)' }}>
      <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0 }}>Properties Inspector</h4>
        <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} onClick={closePanel}>Close</button>
      </div>

      <div style={{ padding: '1rem', flex: 1, overflow: 'auto' }}>
        {selectedNode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-color)', borderRadius: '4px' }}>
              <strong>Type:</strong> {selectedNode.type}
            </div>
            
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>ID</label>
              <input 
                type="text" 
                value={selectedNode.id} 
                onChange={(e) => updateNode('id', e.target.value)}
                className="input"
                style={{ padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Elevation (m)</label>
              <input 
                type="number" 
                value={selectedNode.elevation} 
                onChange={(e) => updateNode('elevation', parseFloat(e.target.value) || 0)}
                className="input"
                style={{ padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
              />
            </div>

            {selectedNode.type === 'Junction' && (
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Base Demand (L/s)</label>
                <input 
                  type="number" 
                  value={(selectedNode as Junction).baseDemand} 
                  onChange={(e) => updateNode('baseDemand', parseFloat(e.target.value) || 0)}
                  className="input"
                  style={{ padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                />
              </div>
            )}

            {selectedNode.type === 'Reservoir' && (
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Head (m)</label>
                <input 
                  type="number" 
                  value={(selectedNode as any).totalHead} 
                  onChange={(e) => updateNode('totalHead', parseFloat(e.target.value) || 0)}
                  className="input"
                  style={{ padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                />
              </div>
            )}
            
            {state.results?.nodes[selectedNode.id] && (
              <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(30, 64, 175, 0.1)', borderRadius: '4px', border: '1px solid var(--color-primary)' }}>
                <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-primary)' }}>Hydraulic Results</h5>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.875rem' }}>Pressure:</span>
                  <strong style={{ color: state.results.nodes[selectedNode.id].pressure < 0 ? 'var(--color-danger)' : 'inherit' }}>
                    {state.results.nodes[selectedNode.id].pressure.toFixed(2)} m
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.875rem' }}>Head:</span>
                  <strong>{state.results.nodes[selectedNode.id].head.toFixed(2)} m</strong>
                </div>
              </div>
            )}
            
            <button 
              className="btn btn-outline" 
              style={{ marginTop: '1rem', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
              onClick={() => dispatch({ type: 'DELETE_NODE', payload: selectedNode.id })}
            >
              Delete Node
            </button>
          </div>
        )}

        {selectedLink && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-color)', borderRadius: '4px' }}>
              <strong>Type:</strong> {selectedLink.type}
            </div>
            
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>ID</label>
              <input 
                type="text" 
                value={selectedLink.id} 
                onChange={(e) => updateLink('id', e.target.value)}
                className="input"
                style={{ padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Start Node</label>
              <input 
                type="text" 
                value={selectedLink.startNode} 
                onChange={(e) => updateLink('startNode', e.target.value)}
                className="input"
                style={{ padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>End Node</label>
              <input 
                type="text" 
                value={selectedLink.endNode} 
                onChange={(e) => updateLink('endNode', e.target.value)}
                className="input"
                style={{ padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
              />
            </div>

            {selectedLink.type === 'Pipe' && (
              <>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Length (m)</label>
                  <input 
                    type="number" 
                    value={(selectedLink as Pipe).length} 
                    onChange={(e) => updateLink('length', parseFloat(e.target.value) || 0)}
                    className="input"
                    style={{ padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Diameter (mm)</label>
                  <input 
                    type="number" 
                    value={(selectedLink as Pipe).diameter} 
                    onChange={(e) => updateLink('diameter', parseFloat(e.target.value) || 0)}
                    className="input"
                    style={{ padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Roughness (H-W C)</label>
                  <input 
                    type="number" 
                    value={(selectedLink as Pipe).roughness} 
                    onChange={(e) => updateLink('roughness', parseFloat(e.target.value) || 0)}
                    className="input"
                    style={{ padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                  />
                </div>
              </>
            )}

            {state.results?.links[selectedLink.id] && (
              <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(30, 64, 175, 0.1)', borderRadius: '4px', border: '1px solid var(--color-primary)' }}>
                <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-primary)' }}>Hydraulic Results</h5>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.875rem' }}>Flow:</span>
                  <strong>{state.results.links[selectedLink.id].flow.toFixed(2)} L/s</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.875rem' }}>Velocity:</span>
                  <strong style={{ color: state.results.links[selectedLink.id].velocity > 3 ? 'var(--color-danger)' : 'inherit' }}>
                    {state.results.links[selectedLink.id].velocity.toFixed(2)} m/s
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.875rem' }}>Headloss:</span>
                  <strong>{state.results.links[selectedLink.id].headloss.toFixed(2)} m</strong>
                </div>
              </div>
            )}
            
            <button 
              className="btn btn-outline" 
              style={{ marginTop: '1rem', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
              onClick={() => dispatch({ type: 'DELETE_LINK', payload: selectedLink.id })}
            >
              Delete Pipe
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
