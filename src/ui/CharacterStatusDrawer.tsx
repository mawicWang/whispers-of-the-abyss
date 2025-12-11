import React, { useEffect, useState } from 'react';
import { useGameStore } from '../state/store';
import { ecs } from '../entities';
import type { Entity } from '../entities';

export const CharacterStatusDrawer: React.FC = () => {
    const selectedEntityId = useGameStore((state) => state.selectedEntityId);
    const [entity, setEntity] = useState<Entity | null>(null);

    // Poll for entity updates (since ECS is outside React state)
    useEffect(() => {
        let interval: any;
        if (selectedEntityId) {
            // Initial fetch
            const found = ecs.entities.find(e => e.id === selectedEntityId);
            setEntity(found || null);

            // Poll for changes (sanity updates)
            interval = setInterval(() => {
                const current = ecs.entities.find(e => e.id === selectedEntityId);
                if (current) {
                    // Force update by cloning or setting state if values changed
                    // Since Miniplex mutates objects, we rely on React detecting the object ref or we force update
                    // Here we just set it again. To ensure re-render on mutation, we might need a version counter or spread.
                    setEntity({ ...current });
                } else {
                    setEntity(null);
                }
            }, 100);
        } else {
            setEntity(null);
        }
        return () => clearInterval(interval);
    }, [selectedEntityId]);

    const isOpen = !!entity;

    // Resolve Portrait URL
    const getPortraitUrl = (spriteName?: string) => {
        if (!spriteName) return '';
        // Mapping based on file structure observed in public/assets
        // public/assets/MiniWorldSprites/Characters/Workers/CyanWorker/FarmerCyan.png
        // We need to infer the subfolder from the sprite name if possible, or try a best guess.
        // Given 'FarmerCyan', the folder is 'CyanWorker'.
        // Logic: 'Farmer' + Color -> Color + 'Worker' folder?
        // Or simpler: The user probably wants it to work for the test workers.
        // Worker names: FarmerCyan, FarmerRed, etc.
        let subfolder = '';
        if (spriteName.includes('Cyan')) subfolder = 'CyanWorker/';
        else if (spriteName.includes('Red')) subfolder = 'RedWorker/';
        else if (spriteName.includes('Lime')) subfolder = 'LimeWorker/';
        else if (spriteName.includes('Purple')) subfolder = 'PurpleWorker/';

        // Path is public/assets/MiniWorldSprites/Characters/Workers/{Subfolder}{SpriteName}.png
        return new URL(`assets/MiniWorldSprites/Characters/Workers/${subfolder}${spriteName}.png`, document.baseURI).href;
    };

    const styles: Record<string, React.CSSProperties> = {
        drawer: {
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '128px', // Approx 4 characters high (32 * 4)
            backgroundColor: 'rgba(20, 20, 30, 0.95)',
            borderBottom: '4px solid #4a4a6a',
            transform: isOpen ? 'translateY(0)' : 'translateY(-100%)',
            transition: 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            padding: '16px',
            boxSizing: 'border-box',
            zIndex: 1000,
            color: '#fff',
            fontFamily: 'system-ui, "Segoe UI", Roboto, sans-serif, monospace',
            imageRendering: 'pixelated',
            boxShadow: '0 4px 8px rgba(0,0,0,0.5)'
        },
        portraitContainer: {
            width: '96px',
            height: '96px',
            marginRight: '24px',
            backgroundColor: '#000',
            border: '4px solid #6d6d8d',
            flexShrink: 0, // Prevent shrinking
            overflow: 'hidden',
            position: 'relative'
        },
        statsContainer: {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '12px'
        },
        statRow: {
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        barContainer: {
            width: '150px',
            height: '12px',
            backgroundColor: '#333',
            border: '2px solid #555',
            position: 'relative'
        },
        barFill: {
            height: '100%',
            backgroundColor: '#4fc3f7', // Cyan for sanity
            transition: 'width 0.2s'
        }
    };

    if (!entity && !isOpen) return null;

    const sanity = entity?.attributes?.sanity;
    const current = sanity?.current ?? 0;
    const max = sanity?.max ?? 100;
    const pct = Math.max(0, Math.min(100, (current / max) * 100));

    return (
        <div style={styles.drawer}>
            <div style={styles.portraitContainer}>
                {entity?.appearance?.sprite && (
                    <div style={{
                        width: '100%',
                        height: '100%',
                        backgroundImage: `url(${getPortraitUrl(entity.appearance.sprite)})`,
                        backgroundPosition: '0 0',
                        backgroundSize: '500% auto', // Assumes 5-column sprite sheet
                        imageRendering: 'pixelated'
                    }} />
                )}
            </div>
            <div style={styles.statsContainer}>
                <div style={{ fontSize: '18px', marginBottom: '8px', color: '#ffd700' }}>
                     {/* Name or ID */}
                     {entity?.id || 'Unknown'}
                </div>
                <div style={styles.statRow}>
                    <span>理智:</span>
                    <span>{Math.floor(current)}/{max}</span>
                </div>
                {/* Visual Bar for Sanity */}
                <div style={styles.barContainer}>
                    <div style={{ ...styles.barFill, width: `${pct}%` }} />
                </div>
            </div>
        </div>
    );
};
