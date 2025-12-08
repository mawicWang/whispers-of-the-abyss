import React from 'react';
import './NavigationHeader.css';
import './DemonKingInterface.css'; // For general .dk-icon styles

interface NavigationHeaderProps {
    title: string;
    onBack: () => void;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({ title, onBack }) => {
    return (
        <div className="nav-header">
            <button className="nav-back-btn" onClick={onBack}>
                <div className="dk-icon dk-icon-back"></div>
            </button>
            <span className="nav-title">{title}</span>
        </div>
    );
};
