
import { useState } from 'react';
import { useGameStore } from '../state/store';
import './DemonKingInterface.css';

type Tab = 'DASHBOARD' | 'INVENTORY' | 'SKILLS' | 'QUESTS' | 'SETTINGS';

export const DemonKingInterface = () => {
  const { mana, suspicion, isDrawerOpen, toggleDrawer } = useGameStore();
  const [activeTab, setActiveTab] = useState<Tab>('DASHBOARD');

  const renderContent = () => {
    switch (activeTab) {
      case 'DASHBOARD':
        return (
          <div>
            <h3 className="dk-section-title">Demon Stats</h3>
            <p>Mana: {mana}</p>
            <p>Suspicion: {suspicion}%</p>
            <p>Corruption Level: Low</p>
            <p>Domain Influence: 12%</p>
          </div>
        );
      case 'INVENTORY':
        return (
          <div>
             <h3 className="dk-section-title">Treasury</h3>
             <div className="dk-grid">
                {[...Array(12)].map((_, i) => (
                    <div key={i} className="dk-item-slot">Item {i+1}</div>
                ))}
             </div>
          </div>
        );
      case 'SKILLS':
        return <div><h3 className="dk-section-title">Dark Arts</h3><p>Skill Tree Implementation Pending</p></div>;
      case 'QUESTS':
        return <div><h3 className="dk-section-title">Nefarious Plots</h3><p>No active plots.</p></div>;
      case 'SETTINGS':
        return <div><h3 className="dk-section-title">System</h3><p>Audio: ON</p><p>Graphics: High</p></div>;
      default:
        return null;
    }
  };

  return (
    <div className="dk-interface">
      {/* Minimized Mode (Bottom Left) */}
      <div className={`dk-minimized ${isDrawerOpen ? 'hidden' : ''}`} style={{ opacity: isDrawerOpen ? 0 : 1, transition: 'opacity 0.2s' }}>
        <div className="dk-status-bar">
          <div className="dk-stat-row">
            <span>MANA</span>
            <span className="dk-stat-value">{mana}</span>
          </div>
          <div className="dk-stat-row">
            <span>SUSPICION</span>
            <span className="dk-stat-value" style={{ color: suspicion > 50 ? 'var(--dk-danger)' : 'var(--dk-accent)' }}>{suspicion}%</span>
          </div>
        </div>

        <div className="dk-quick-actions">
           <button className="dk-btn" onClick={() => console.log('Quick Cast 1')}>🔥</button>
           <button className="dk-btn" onClick={() => console.log('Quick Cast 2')}>❄️</button>
           <button className="dk-btn" onClick={() => console.log('Quick Cast 3')}>💀</button>
        </div>

        <button className="dk-btn dk-btn-toggle" onClick={() => toggleDrawer(true)}>
          ▲ MANAGE
        </button>
      </div>

      {/* Full Panel Mode (Drawer) */}
      <div className={`dk-drawer ${isDrawerOpen ? 'open' : ''}`}>
        <div className="dk-drawer-header">
           <span className="dk-drawer-title">Demon King Control</span>
           <button className="dk-close-btn" onClick={() => toggleDrawer(false)}>✕</button>
        </div>

        <div className="dk-drawer-content">
           <div className="dk-sidebar">
              <button className={`dk-tab-btn ${activeTab === 'DASHBOARD' ? 'active' : ''}`} onClick={() => setActiveTab('DASHBOARD')}>Stats</button>
              <button className={`dk-tab-btn ${activeTab === 'INVENTORY' ? 'active' : ''}`} onClick={() => setActiveTab('INVENTORY')}>Inventory</button>
              <button className={`dk-tab-btn ${activeTab === 'SKILLS' ? 'active' : ''}`} onClick={() => setActiveTab('SKILLS')}>Skills</button>
              <button className={`dk-tab-btn ${activeTab === 'QUESTS' ? 'active' : ''}`} onClick={() => setActiveTab('QUESTS')}>Quests</button>
              <button className={`dk-tab-btn ${activeTab === 'SETTINGS' ? 'active' : ''}`} onClick={() => setActiveTab('SETTINGS')}>Settings</button>
           </div>

           <div className="dk-main-view">
              {renderContent()}
           </div>
        </div>
      </div>
    </div>
  );
};
