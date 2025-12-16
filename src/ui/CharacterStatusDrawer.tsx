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

    const getDebuffIconUrl = (iconKey: string) => {
        if (iconKey === 'influence_icon') {
            return new URL('assets/UserInterface/InfluenceIcon.png', document.baseURI).href;
        }
        return '';
    };

    const sanity = entity?.attributes?.sanity;
    const currentSanity = sanity?.current ?? 0;
    const maxSanity = sanity?.max ?? 100;
    const sanityPct = Math.max(0, Math.min(100, (currentSanity / maxSanity) * 100));

    const stamina = entity?.attributes?.stamina;
    const currentStamina = stamina?.current ?? 0;
    const maxStamina = stamina?.max ?? 10;
    const staminaPct = Math.max(0, Math.min(100, (currentStamina / maxStamina) * 100));

    const corruption = entity?.attributes?.corruption;
    const currentCorruption = corruption?.current ?? 0;
    const maxCorruption = corruption?.max ?? 100;
    const corruptionPct = Math.max(0, Math.min(100, (currentCorruption / maxCorruption) * 100));

    // Determine Title and Color
    let title = '';
    let nameColor = '#ffffff'; // White default

    // Corruption logic
    if (currentSanity <= 0) {
        // "My Believer"
        if (currentCorruption >= 100) {
             title = '代行者 (Avatar)';
             nameColor = '#ff4500'; // OrangeRed
        } else if (currentCorruption >= 81) {
             title = '先驱 (Harbinger)';
             nameColor = '#9d4edd'; // Purple
        } else if (currentCorruption >= 51) {
             title = '狂信徒 (Zealot)';
             nameColor = '#2196f3'; // Blue
        } else if (currentCorruption >= 21) {
             title = '受膏者 (Anointed)';
             nameColor = '#4caf50'; // Green
        } else {
             title = '聆听者 (Listener)';
             nameColor = '#ffffff'; // White
        }
    }

    const currentAction = entity?.goat?.currentActionName;

    const styles: Record<string, React.CSSProperties> = {
        drawer: {
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '168px', // Increased height to fit Action Row
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
            width: '120px',
            height: '120px',
            marginRight: '24px',
            backgroundColor: 'transparent', // Transparent to let Pixi monitor show through
            border: '2px solid #6d6d8d',
            borderRadius: '4px',
            flexShrink: 0,
            overflow: 'hidden',
            position: 'relative',
            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
            imageRendering: 'pixelated'
        },
        statsContainer: {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '6px' // Reduced gap to fit all bars
        },
        statRow: {
            fontSize: '14px', // Reduced font size slightly
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        barContainer: {
            width: '150px',
            height: '10px', // Reduced height slightly
            backgroundColor: '#333',
            border: '2px solid #555',
            position: 'relative'
        },
        barFill: {
            height: '100%',
            transition: 'width 0.2s'
        },
        debuffContainer: {
            display: 'flex',
            gap: '6px',
            minHeight: '24px',
            alignItems: 'center',
            marginTop: '-2px',
            marginBottom: '2px'
        },
        debuffItem: {
             position: 'relative',
             width: '20px',
             height: '20px',
             backgroundColor: 'rgba(0,0,0,0.3)',
             border: '1px solid #555',
             borderRadius: '4px',
        },
        debuffTimer: {
            position: 'absolute',
            bottom: '-6px',
            right: '-4px',
            fontSize: '9px',
            color: '#fff',
            textShadow: '1px 1px 0 #000',
            fontWeight: 'bold',
            zIndex: 2
        },
        titleText: {
            fontSize: '12px',
            color: '#aaa',
            marginLeft: '8px',
            fontStyle: 'italic'
        },
        actionText: {
            fontSize: '12px',
            color: '#aaa',
            fontStyle: 'italic',
            marginLeft: 'auto'
        }
    };

    // Keep drawer rendered but hidden if not open? No, transition needs it in DOM.
    // If not entity, we can still render if transitioning. But easier to rely on isOpen.
    // However, if we unmount, transition might be lost.
    // For now, let's just return null if no entity.
    if (!entity && !isOpen) return null;

    return (
        <div style={styles.drawer}>
            <div style={styles.portraitContainer}>
                {/*
                   WorkerObserver removed.
                   The Avatar Monitor is now rendered in the main Pixi scene
                   positioned underneath this transparent container.
                */}
            </div>
            <div style={styles.statsContainer}>
                <div style={{ fontSize: '18px', color: nameColor, display: 'flex', alignItems: 'baseline', minWidth: '300px' }}>
                     {/* Name or ID */}
                     {entity?.id || 'Unknown'}
                     {title && <span style={styles.titleText}>{title}</span>}
                </div>

                {/* Debuffs Section */}
                <div style={styles.debuffContainer}>
                     {entity?.debuffs && entity.debuffs.map((debuff, i) => (
                        <div key={i} style={styles.debuffItem} title={`${debuff.type} (${Math.ceil(debuff.duration)}s)`}>
                            <div style={{
                                width: '100%',
                                height: '100%',
                                backgroundImage: `url(${getDebuffIconUrl(debuff.icon)})`,
                                backgroundSize: '16px 16px',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center',
                                imageRendering: 'pixelated'
                            }} />
                            <div style={styles.debuffTimer}>{Math.ceil(debuff.duration)}s</div>
                        </div>
                     ))}
                </div>

                <div style={styles.statRow}>
                    <span style={{ minWidth: '50px' }}>理智:</span>
                    <div style={styles.barContainer}>
                        <div style={{ ...styles.barFill, width: `${sanityPct}%`, backgroundColor: '#4fc3f7' }} />
                    </div>
                    <span>{Math.floor(currentSanity)}/{maxSanity}</span>
                </div>

                {stamina && (
                    <div style={styles.statRow}>
                        <span style={{ minWidth: '50px' }}>精力:</span>
                        <div style={styles.barContainer}>
                            <div style={{ ...styles.barFill, width: `${staminaPct}%`, backgroundColor: '#4caf50' }} />
                        </div>
                        <span>{Math.floor(currentStamina)}/{maxStamina}</span>
                    </div>
                )}

                {(currentSanity <= 0 || currentCorruption > 0) && (
                    <div style={styles.statRow}>
                        <span style={{ minWidth: '50px', color: '#9d4edd' }}>侵蚀:</span>
                        <div style={styles.barContainer}>
                            <div style={{ ...styles.barFill, width: `${corruptionPct}%`, backgroundColor: '#9d4edd' }} />
                        </div>
                        <span style={{color: '#9d4edd'}}>{Math.floor(currentCorruption)}/{maxCorruption}</span>
                    </div>
                )}

                {/* Current Action Display */}
                {currentAction && (
                    <div style={{ ...styles.statRow, marginTop: '4px', color: '#ffd700' }}>
                        <span style={{ minWidth: '50px' }}>状态:</span>
                        <span>{currentAction}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
