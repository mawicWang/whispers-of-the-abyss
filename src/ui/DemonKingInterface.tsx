import React, { useState } from 'react';
import { useGameStore } from '../state/store';
import './DemonKingInterface.css';

// Icons mapping based on spritesheet_config.json
// We will use CSS classes to display these, relying on background-image and position.
// This requires 'UiIcons.png' to be available at /assets/MiniWorldSprites/User Interface/UiIcons.png
// or we adjust the path in CSS.

type Mode = 'minimized' | 'full';

const DemonKingInterface: React.FC = () => {
  const [mode, setMode] = useState<Mode>('minimized');
  const { mana, suspicion } = useGameStore();

  const toggleMode = () => {
    setMode(prev => prev === 'minimized' ? 'full' : 'minimized');
  };

  return (
    <div className="demon-king-interface">
      {/* Layer 2: The Demon King Interface */}

      {/* Minimized Mode (Always visible, but changes position/content when full) */}
      <div className={`interface-layer ${mode}`}>

        {/* Status Bar - Visible in both modes but styled differently if needed */}
        <div className="status-bar">
            <div className="stat-item mana">
                <span className="icon icon-mana"></span>
                <span className="value">{mana}</span>
                <span className="label">Mana</span>
            </div>
            <div className="stat-item suspicion">
                <span className="icon icon-suspicion"></span>
                <span className="value">{suspicion}</span>
                <span className="label">Suspicion</span>
            </div>
        </div>

        {mode === 'minimized' && (
          <div className="quick-actions">
            <button className="action-btn" onClick={() => console.log('Action 1')}>1</button>
            <button className="action-btn" onClick={() => console.log('Action 2')}>2</button>
            <button className="action-btn" onClick={() => console.log('Action 3')}>3</button>
          </div>
        )}

        {/* Expand/Collapse Handle */}
        <button className="mode-toggle-btn" onClick={toggleMode}>
            {mode === 'minimized' ? '▲' : '▼'}
        </button>

        {/* Full Panel Content (Only visible in full mode) */}
        {mode === 'full' && (
          <div className="full-panel-content">
             <div className="panel-header">
                 <h2>Demon King's Dashboard</h2>
             </div>
             <div className="panel-grid">
                 <div className="panel-card inventory">
                     <h3>Inventory</h3>
                     <div className="placeholder-grid">
                         {[...Array(8)].map((_, i) => <div key={i} className="grid-slot"></div>)}
                     </div>
                 </div>
                 <div className="panel-card skills">
                     <h3>Skills</h3>
                     <div className="placeholder-list">
                         <div>Fireball</div>
                         <div>Teleport</div>
                         <div>Summon Minion</div>
                     </div>
                 </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DemonKingInterface;
