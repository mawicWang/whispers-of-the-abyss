import React from 'react';
import './LoadingScreen.css';

interface LoadingScreenProps {
    progress: number;
    currentAsset: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ progress, currentAsset }) => {
    return (
        <div className="loading-screen">
            <div className="loading-title">LOADING...</div>
            <div className="loading-bar-container">
                <div
                    className="loading-bar-fill"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
            </div>
            <div className="loading-text">{currentAsset}</div>
            <div className="loading-text">{progress}%</div>
        </div>
    );
};

export default LoadingScreen;
