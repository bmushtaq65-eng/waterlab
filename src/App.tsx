import React from 'react';
import { WaterProvider } from './modules/water/context/WaterContext';
import { WaterWorkspace } from './modules/water/components/WaterWorkspace';
import './App.css';

function App() {
  return (
    <WaterProvider>
      <div className="app-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header style={{ padding: '1rem', backgroundColor: 'var(--surface-color)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center' }}>
          <div className="logo" style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-primary)', letterSpacing: '-1px' }}>
            WATERLAB
          </div>
        </header>
        <main style={{ flex: 1, overflow: 'hidden' }}>
          <WaterWorkspace />
        </main>
      </div>
    </WaterProvider>
  );
}

export default App;
