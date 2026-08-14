import React, { useState } from 'react';
import { useWaterContext } from '../context/WaterContext';
import { DataTables } from './DataTables';
import { NetworkCanvas } from './NetworkCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import { EpanetEngine } from '../engine/EpanetEngine';
import { ImportModal } from './ImportModal';

export function WaterWorkspace() {
  const { state, dispatch } = useWaterContext();
  const [analyzing, setAnalyzing] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const engine = new EpanetEngine();

      // Give clear, specific feedback instead of a cryptic EPANET error
      const issues = engine.validateNetwork(state.model);
      if (issues.length > 0) {
        const msg = issues.map(i => `• ${i.message}`).join('\n');
        alert(`The network needs attention before it can be analyzed:\n\n${msg}`);
        dispatch({ type: 'SET_RESULTS', payload: null });
        dispatch({ type: 'SET_WARNINGS', payload: [] });
        setAnalyzing(false);
        return;
      }

      const results = await engine.runSimulation(state.model);
      const warnings = engine.generateWarnings(results, { minPressure: 10, maxPressure: 100, maxVelocity: 3, maxHeadloss: 10 });
      dispatch({ type: 'SET_RESULTS', payload: results });
      dispatch({ type: 'SET_WARNINGS', payload: warnings });
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || err.toString() || "Unknown hydraulic error";
      alert(`Hydraulic analysis failed:\n${errMsg}\n\nPlease check the network topology (all nodes connected, at least one reservoir) and try again.`);
      
      // Clear previous results on failure
      dispatch({ type: 'SET_RESULTS', payload: null });
      dispatch({ type: 'SET_WARNINGS', payload: [] });
    }
    setAnalyzing(false);
  };

  const addNode = (type: 'Junction' | 'Reservoir') => {
    // Pick a unique suffix so IDs never collide after clear-and-rebuild
    let maxNum = 0;
    state.model.nodes.forEach(n => {
      const m = n.id.match(/(\d+)$/);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1]));
    });
    const id = `${type.charAt(0)}-${maxNum + 1}`;
    const newNode = type === 'Junction' 
      ? { id, type, elevation: 0, baseDemand: 0 }
      : { id, type, elevation: 100, totalHead: 100 };
    dispatch({ type: 'SET_NODES', payload: [...state.model.nodes, newNode as any] });
    dispatch({ type: 'SELECT_NODE', payload: id });
  };

  const toggleDrawMode = () => {
    if (state.interactionMode === 'draw_pipe') {
      dispatch({ type: 'SET_INTERACTION_MODE', payload: 'select' });
    } else {
      dispatch({ type: 'SET_INTERACTION_MODE', payload: 'draw_pipe' });
    }
  };

  const handleNodeClick = (id: string) => {
    if (state.interactionMode === 'draw_pipe') {
      if (!state.drawStartNode) {
        dispatch({ type: 'SET_DRAW_START_NODE', payload: id });
      } else {
        if (state.drawStartNode !== id) {
          // Pick a unique pipe ID
          let maxNum = 0;
          state.model.links.forEach(l => {
            const m = l.id.match(/(\d+)$/);
            if (m) maxNum = Math.max(maxNum, parseInt(m[1]));
          });
          const pipeId = `P-${maxNum + 1}`;
          const newLink = { id: pipeId, type: 'Pipe', startNode: state.drawStartNode, endNode: id, length: 100, diameter: 150, roughness: 130, status: 'Open' };
          dispatch({ type: 'SET_LINKS', payload: [...state.model.links, newLink as any] });
          dispatch({ type: 'SELECT_LINK', payload: pipeId });
        }
        dispatch({ type: 'SET_INTERACTION_MODE', payload: 'select' });
      }
    } else {
      dispatch({ type: 'SELECT_NODE', payload: id });
    }
  };

  return (
    <div className="workspace" style={{ display: 'flex', flexDirection: 'row', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {!isFullScreen && (
        <div className="sidebar" style={{ width: '300px', backgroundColor: 'var(--surface-color)', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>
          <div className="sidebar-header" style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
             <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Water Network</h2>
          </div>
          <div className="sidebar-content" style={{ padding: '1rem', flex: 1, overflow: 'auto' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Configure your water network below.</p>
            <div style={{ marginTop: '2rem' }}>
              <h4>Network Info</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                <span>Nodes:</span>
                <strong>{state.model.nodes.length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                <span>Links:</span>
                <strong>{state.model.links.length}</strong>
              </div>
              
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '2rem' }}
                onClick={runAnalysis}
                disabled={analyzing}
              >
                {analyzing ? 'Analyzing...' : 'Run Analysis'}
              </button>
              
              <button 
                className="btn btn-outline" 
                style={{ width: '100%', marginTop: '0.5rem', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                onClick={async () => {
                  setAnalyzing(true);
                  try {
                    const engine = new EpanetEngine();
                    const issues = engine.validateNetwork(state.model);
                    if (issues.length > 0) {
                      const msg = issues.map(i => `• ${i.message}`).join('\n');
                      alert(`Auto-sizing needs a valid network first:\n\n${msg}`);
                      setAnalyzing(false);
                      return;
                    }
                    const { AutoSizer } = await import('../engine/AutoSizer');
                    const autoSizer = new AutoSizer();
                    const { model: optimizedModel, iterations } = await autoSizer.designNetwork(state.model, { minPressure: 15, maxPressure: 100, maxVelocity: 2.0, maxHeadloss: 10 });
                    dispatch({ type: 'SET_NODES', payload: optimizedModel.nodes });
                    dispatch({ type: 'SET_LINKS', payload: optimizedModel.links });
                    alert(`Auto-Sizing Complete!\nOptimized in ${iterations} iterations.\nConstraints met: Velocity < 2.0 m/s, Pressure > 15m.`);
                    // Rerun analysis to update results
                    const results = await engine.runSimulation(optimizedModel);
                    dispatch({ type: 'SET_RESULTS', payload: results });
                  } catch (err: any) {
                    alert(`Auto-Sizing Failed:\n${err.message}`);
                  }
                  setAnalyzing(false);
                }}
                disabled={analyzing}
              >
                {analyzing ? '...' : 'Auto-Size Pipes'}
              </button>
              
              <button 
                className="btn btn-outline" 
                style={{ width: '100%', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                onClick={() => {
                  import('../utils/excelExport').then(module => {
                    module.exportWaterNetworkToExcel(state);
                  });
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Generate Excel
              </button>
              <button 
                className="btn btn-outline" 
                style={{ width: '100%', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                onClick={() => setIsImportModalOpen(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Import Excel Data
              </button>

              <button 
                className="btn btn-outline" 
                style={{ width: '100%', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                onClick={() => {
                  import('../utils/waterReportGenerator').then(module => {
                    const html = module.generateWaterReport(state);
                    module.openWaterReport(html);
                  });
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                Print PDF Report
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-color)' }}>
        <div className="top-bar" style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--surface-color)', display: 'flex', alignItems: 'center' }}>
          <h3 style={{ margin: 0, flex: 1 }}>Network Editor</h3>
          {isFullScreen && (
            <div style={{ display: 'flex', gap: '0.5rem', marginRight: '1rem', alignItems: 'center' }}>
              {state.interactionMode === 'draw_pipe' && state.drawStartNode && (
                <span style={{ fontSize: '0.875rem', color: 'var(--color-primary)', fontWeight: 'bold', marginRight: '1rem' }}>
                  Click destination node...
                </span>
              )}
              <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} onClick={() => addNode('Junction')}>+ Add Junction</button>
              <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} onClick={() => addNode('Reservoir')}>+ Add Reservoir</button>
              <button 
                className={`btn ${state.interactionMode === 'draw_pipe' ? 'btn-primary' : 'btn-outline'}`} 
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} 
                onClick={toggleDrawMode}
              >
                {state.interactionMode === 'draw_pipe' ? 'Cancel Draw' : '+ Draw Pipe'}
              </button>
              <div style={{ width: '1px', backgroundColor: 'var(--color-border)', margin: '0 0.5rem' }}></div>
              <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} onClick={runAnalysis} disabled={analyzing}>
                {analyzing ? '...' : 'Analyze'}
              </button>
              <div style={{ width: '1px', backgroundColor: 'var(--color-border)', margin: '0 0.5rem' }}></div>
              <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} onClick={() => {
                if (window.confirm("Are you sure you want to clear the entire network? This cannot be undone.")) {
                  dispatch({ type: 'CLEAR_NETWORK' });
                }
              }}>
                Clear Network
              </button>
            </div>
          )}
          <button className="btn btn-outline" onClick={() => setIsFullScreen(!isFullScreen)}>
            {isFullScreen ? 'Exit Full Screen' : 'Full Screen Map'}
          </button>
        </div>
        {state.results && (
          <div style={{
            padding: '0.5rem 1rem',
            backgroundColor: state.warnings.length > 0 ? 'rgba(250, 204, 21, 0.08)' : 'rgba(34, 197, 94, 0.08)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            gap: '1.5rem',
            alignItems: 'center',
            fontSize: '0.875rem',
            flexWrap: 'wrap',
          }}>
            <span>
              <strong>Status:</strong>{' '}
              <span style={{ color: state.results.converged ? '#22c55e' : '#ef4444' }}>
                {state.results.converged ? 'Converged ✓' : 'Failed ✗'}
              </span>
            </span>
            <span><strong>Nodes:</strong> {state.model.nodes.length}</span>
            <span><strong>Pipes:</strong> {state.model.links.filter(l => l.type === 'Pipe').length}</span>
            <span><strong>Supply:</strong> {state.results.totalSupply.toFixed(1)} L/s</span>
            <span><strong>Demand:</strong> {state.results.totalDemand.toFixed(1)} L/s</span>
            <span><strong>Max P:</strong> {state.results.maxPressure.toFixed(1)} m</span>
            <span><strong>Min P:</strong> {state.results.minPressure.toFixed(1)} m</span>
            {state.warnings.length > 0 && (
              <span style={{ color: '#d97706', fontWeight: 500 }}>
                ⚠ {state.warnings.length} warning{state.warnings.length !== 1 ? 's' : ''}
              </span>
            )}
            <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
              Click a node to see detailed results
            </span>
          </div>
        )}
        <div className="content-area" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ flex: 1, borderRight: '1px solid var(--color-border)', position: 'relative' }}>
             <NetworkCanvas 
               model={state.model} 
               results={state.results} 
               selectedNodeId={state.interactionMode === 'draw_pipe' ? state.drawStartNode : state.selectedNodeId}
               selectedLinkId={state.selectedLinkId}
               onNodeClick={handleNodeClick}
               onLinkClick={(id) => { if (state.interactionMode !== 'draw_pipe') dispatch({ type: 'SELECT_LINK', payload: id }) }}
               onNodePositionChange={(id, x, y) => dispatch({ type: 'UPDATE_NODE_POS', payload: { id, x, y } })}
             />
          </div>
          {(!isFullScreen || (isFullScreen && (state.selectedNodeId || state.selectedLinkId))) && (
            <div style={{ width: '400px', overflow: 'auto', borderLeft: '1px solid var(--color-border)' }}>
              {(state.selectedNodeId || state.selectedLinkId) ? <PropertiesPanel /> : <DataTables />}
            </div>
          )}
        </div>
      </div>
      
      <ImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)}
        onImport={(nodes, links) => {
          let updatedNodes = [...state.model.nodes];
          if (nodes.length > 0) {
            updatedNodes = [...updatedNodes, ...nodes];
            dispatch({ type: 'SET_NODES', payload: updatedNodes });
          }
          if (links.length > 0) {
            // Strip orphaned links that don't have valid nodes
            const validLinks = links.filter(l => 
              updatedNodes.some(n => n.id === l.startNode) && 
              updatedNodes.some(n => n.id === l.endNode)
            );
            dispatch({ type: 'SET_LINKS', payload: [...state.model.links, ...validLinks] });
            if (validLinks.length < links.length) {
              alert(`Import Warning: ${links.length - validLinks.length} pipes were skipped because they connected to non-existent nodes.`);
            }
          }
        }}
      />
    </div>
  );
}
