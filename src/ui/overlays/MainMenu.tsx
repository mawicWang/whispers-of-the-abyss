import React from 'react';
import './MainMenu.css';

interface MainMenuProps {
    onNavigate: (scene: 'sprites' | 'tilemap') => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onNavigate }) => {
    return (
        <div className="main-menu-container">
            <h1 className="main-menu-title">Main Menu</h1>
            <button className="main-menu-btn" onClick={() => onNavigate('sprites')}>
                Sprites测试
            </button>
            <button className="main-menu-btn" onClick={() => onNavigate('tilemap')}>
                Demo
            </button>
        </div>
    );
};
