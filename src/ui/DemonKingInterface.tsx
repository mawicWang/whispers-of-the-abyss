
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
          <div className="dk-view-dashboard">
            <h3 className="dk-section-title">Demon Stats</h3>
            <div className="dk-info-row"><strong>Corruption Level:</strong> Low</div>
            <div className="dk-info-row"><strong>Domain Influence:</strong> 12%</div>
            <div className="dk-info-row"><strong>Minions:</strong> 5 / 20</div>
            <div className="dk-info-row"><strong>Gold:</strong> 1,250</div>
          </div>
        );
      case 'INVENTORY':
        return (
          <div>
             <h3 className="dk-section-title">Treasury</h3>
             <div className="dk-grid">
                {[...Array(15)].map((_, i) => (
                    <div key={i} className="dk-item-slot" title={`Item ${i+1}`}>
                        {i < 3 && <div className="dk-icon dk-icon-inventory" style={{ transform: 'scale(0.8)' }}></div>}
                    </div>
                ))}
             </div>
          </div>
        );
      case 'SKILLS':
        return (
            <div>
                <h3 className="dk-section-title">Dark Arts</h3>
                <p className="dk-info-row">Unlock powerful spells to dominate the realm.</p>
                <div className="dk-grid">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="dk-item-slot">
                             <div className="dk-icon dk-icon-skills"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
      case 'QUESTS':
        return (
            <div>
                <h3 className="dk-section-title">Nefarious Plots</h3>
                <div className="dk-info-row">No active plots. The world is at peace... for now.</div>
            </div>
        );
      case 'SETTINGS':
        return (
            <div>
                <h3 className="dk-section-title">System</h3>
                <div className="dk-info-row">Audio: ON</div>
                <div className="dk-info-row">Graphics: High</div>
                <div className="dk-info-row">Notifications: Enabled</div>
            </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="dk-interface">
      {/* Minimized Mode (Bottom Left) */}
      <div className={`dk-minimized ${isDrawerOpen ? 'hidden' : ''}`} style={{ opacity: isDrawerOpen ? 0 : 1, transition: 'opacity 0.2s', pointerEvents: isDrawerOpen ? 'none' : 'auto' }}>
        <div className="dk-status-bar">
          <div className="dk-stat-row">
            <div className="dk-icon dk-icon-mana dk-icon-small"></div>
            <span className="dk-stat-label">Mana</span>
            <span className="dk-stat-value dk-value-mana">{mana}</span>
          </div>
          <div className="dk-stat-row">
            <div className="dk-icon dk-icon-suspicion dk-icon-small"></div>
            <span className="dk-stat-label">Suspicion</span>
            <span className="dk-stat-value dk-value-suspicion">{suspicion}%</span>
          </div>
        </div>

        <div className="dk-quick-actions">
           {/* Placeholder actions - maybe map to skills later */}
           <div className="dk-btn-icon" title="Fireball">🔥</div>
           <div className="dk-btn-icon" title="Freeze">❄️</div>
           <div className="dk-btn-icon" title="Summon">💀</div>
        </div>

        <button className="dk-btn-toggle" onClick={() => toggleDrawer(true)}>
          <div className="dk-icon dk-icon-arrow-up dk-icon-small"></div>
          Manage Domain
        </button>
      </div>

      {/* Full Panel Mode (Drawer) */}
      <div className={`dk-drawer ${isDrawerOpen ? 'open' : ''}`}>
        <div className="dk-drawer-header">
           <span className="dk-drawer-title">
               <div className="dk-icon dk-icon-stats"></div>
               Demon King Control
           </span>
           <button className="dk-close-btn" onClick={() => toggleDrawer(false)}>✕</button>
        </div>

        <div className="dk-drawer-content">
           <div className="dk-sidebar">
              <button className={`dk-tab-btn ${activeTab === 'DASHBOARD' ? 'active' : ''}`} onClick={() => setActiveTab('DASHBOARD')}>
                  <div className="dk-icon dk-icon-stats"></div>
                  <span className="dk-tab-tooltip">Stats</span>
              </button>
              <button className={`dk-tab-btn ${activeTab === 'INVENTORY' ? 'active' : ''}`} onClick={() => setActiveTab('INVENTORY')}>
                  <div className="dk-icon dk-icon-inventory"></div>
                  <span className="dk-tab-tooltip">Inventory</span>
              </button>
              <button className={`dk-tab-btn ${activeTab === 'SKILLS' ? 'active' : ''}`} onClick={() => setActiveTab('SKILLS')}>
                  <div className="dk-icon dk-icon-skills"></div>
                  <span className="dk-tab-tooltip">Skills</span>
              </button>
              <button className={`dk-tab-btn ${activeTab === 'QUESTS' ? 'active' : ''}`} onClick={() => setActiveTab('QUESTS')}>
                  <div className="dk-icon dk-icon-quests"></div>
                  <span className="dk-tab-tooltip">Quests</span>
              </button>
              <button className={`dk-tab-btn ${activeTab === 'SETTINGS' ? 'active' : ''}`} onClick={() => setActiveTab('SETTINGS')}>
                  <div className="dk-icon dk-icon-settings"></div>
                  <span className="dk-tab-tooltip">Settings</span>
              </button>
           </div>

           <div className="dk-main-view">
              {renderContent()}
           </div>
        </div>
      </div>
    </div>
  );
};
