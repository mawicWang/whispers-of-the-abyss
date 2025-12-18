import React from 'react';

interface SuspicionGaugeProps {
    value: number; // 0-100
}

export const SuspicionGauge: React.FC<SuspicionGaugeProps> = ({ value }) => {
    const size = 32;
    const strokeWidth = 4;
    const center = size / 2;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    // SVG stroke-dashoffset calculates from the start point.
    // Usually rotate -90deg makes it start at top.
    const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

    return (
        <div style={{ position: 'relative', width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                {/* Background Circle */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke="#555"
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                {/* Progress Circle */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke="#FFD700"
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                />
            </svg>
            {/* Text */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '9px',
                fontWeight: 'bold',
                color: '#fff',
                fontFamily: 'monospace',
                pointerEvents: 'none',
                textShadow: '1px 1px 0 #000'
            }}>
                {Math.round(value)}%
            </div>
        </div>
    );
};
