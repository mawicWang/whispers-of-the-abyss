import React, { useEffect, useState } from 'react';
import { useGameStore } from '../state/store';
import { ecs } from '../entities';
import type { Entity } from '../entities';

export const CharacterStatusDrawer: React.FC = () => {
    const selectedEntityId = useGameStore((state) => state.selectedEntityId);
    const avatarImage = useGameStore((state) => state.avatarImage);
    const [entity, setEntity] = useState<Entity | null>(null);

    // Poll for entity updates (since ECS is outside React state)
    useEffect(() => {
        let interval: any;
        if (selectedEntityId) {
            // Initial fetch
            const found = ecs.entities.find(e => e.id === selectedEntityId);
            setEntity(found || null);

            // Poll for changes
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
    const sanityPct = maxSanity > 0 ? Math.max(0, Math.min(100, (currentSanity / maxSanity) * 100)) : 0;

    const stamina = entity?.attributes?.stamina;
    const currentStamina = stamina?.current ?? 0;
    const maxStamina = stamina?.max ?? 10;
    const staminaPct = maxStamina > 0 ? Math.max(0, Math.min(100, (currentStamina / maxStamina) * 100)) : 0;

    const corruption = entity?.attributes?.corruption;
    const currentCorruption = corruption?.current ?? 0;
    const maxCorruption = corruption?.max ?? 100;
    const corruptionPct = maxCorruption > 0 ? Math.max(0, Math.min(100, (currentCorruption / maxCorruption) * 100)) : 0;

    const boredom = entity?.attributes?.boredom;
    const currentBoredom = boredom?.current ?? 0;
    const maxBoredom = boredom?.max ?? 100;
    const boredomPct = maxBoredom > 0 ? Math.max(0, Math.min(100, (currentBoredom / maxBoredom) * 100)) : 0;

    const satiety = entity?.attributes?.satiety;
    const currentSatiety = satiety?.current ?? 0;
    const maxSatiety = satiety?.max ?? 100;
    const satietyPct = maxSatiety > 0 ? Math.max(0, Math.min(100, (currentSatiety / maxSatiety) * 100)) : 0;

    // Determine Title and Color
    let title = '';
    let nameColor = '#ffffff'; // White default
    let displayName = entity?.name || entity?.id || 'Unknown';

    // Special logic for Buildings and Wheat
    if (entity?.isBuilding) {
         if (entity.name === '民居') {
             // Try to find owner name?
             // Assuming ID format house-{i} and worker-{i}
             const idx = entity.id?.split('-')[1];
             const worker = ecs.entities.find(e => e.id === `worker-${idx}`);
             const workerName = worker?.name || worker?.id || `Worker ${idx}`;
             displayName = `${workerName} 的家`;
             title = `存储: ${entity.storage?.food || 0}`;
             nameColor = '#ffd700';
         } else if (entity.smartObject) {
             title = entity.smartObject.interactionType;
             nameColor = '#ccc';
         }
    } else if (entity?.isWheat) {
         displayName = '麦田';
         const stage = entity.growth?.stage || 1;
         if (stage === 4) title = '成熟 (Ready)';
         else title = `生长中 (Stage ${stage}/4)`;
         nameColor = '#8bc34a';
    } else if (currentSanity <= 0) {
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

    // Interaction / Occupied logic
    let occupiedText = null;
    if (entity?.smartObject) {
        const claimers = entity.smartObject.slots
            .map(s => s.claimedBy)
            .filter(id => id !== null);
        if (claimers.length > 0) {
            occupiedText = `Occupied by: ${claimers.join(', ')}`;
        }
    }
    if (entity?.claimedBy) {
         occupiedText = `Occupied by: ${entity.claimedBy}`;
    }

    const currentAction = entity?.goap?.currentActionName;

    const styles: Record<string, React.CSSProperties> = {
        drawer: {
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '240px', // Increased height
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
            backgroundColor: '#000',
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
            gap: '4px'
        },
        statRow: {
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        barContainer: {
            width: '120px',
            height: '8px',
            backgroundColor: '#333',
            border: '1px solid #555',
            position: 'relative'
        },
        barFill: {
            height: '100%',
            transition: 'width 0.2s'
        },
        debuffContainer: {
            display: 'flex',
            gap: '6px',
            minHeight: '20px',
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
        }
    };

    if (!entity && !isOpen) return null;

    return (
        <div style={styles.drawer}>
            <div style={styles.portraitContainer}>
                {avatarImage && (
                    <img
                        src={avatarImage}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                        alt="Target Monitor"
                    />
                )}
            </div>
            <div style={styles.statsContainer}>
                <div style={{ fontSize: '18px', color: nameColor, display: 'flex', alignItems: 'baseline', minWidth: '200px', flexWrap: 'wrap' }}>
                     {displayName}
                     {title && <span style={styles.titleText}>{title}</span>}
                </div>

                {/* Debuffs Section */}
                {entity?.debuffs && entity.debuffs.length > 0 && (
                <div style={styles.debuffContainer}>
                     {entity.debuffs.map((debuff, i) => (
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
                )}

                {sanity && (
                <div style={styles.statRow}>
                    <span style={{ minWidth: '40px' }}>理智:</span>
                    <div style={styles.barContainer}>
                        <div style={{ ...styles.barFill, width: `${sanityPct}%`, backgroundColor: '#4fc3f7' }} />
                    </div>
                    <span>{Math.floor(currentSanity)}/{maxSanity}</span>
                </div>
                )}

                {stamina && (
                    <div style={styles.statRow}>
                        <span style={{ minWidth: '40px' }}>精力:</span>
                        <div style={styles.barContainer}>
                            <div style={{ ...styles.barFill, width: `${staminaPct}%`, backgroundColor: '#4caf50' }} />
                        </div>
                        <span>{Math.floor(currentStamina)}/{maxStamina}</span>
                    </div>
                )}

                {boredom && (
                    <div style={styles.statRow}>
                        <span style={{ minWidth: '40px' }}>无聊:</span>
                        <div style={styles.barContainer}>
                            <div style={{ ...styles.barFill, width: `${boredomPct}%`, backgroundColor: '#ff9800' }} />
                        </div>
                        <span>{Math.floor(currentBoredom)}/{maxBoredom}</span>
                    </div>
                )}

                {satiety && (
                    <div style={styles.statRow}>
                        <span style={{ minWidth: '40px' }}>饱腹:</span>
                        <div style={styles.barContainer}>
                            <div style={{ ...styles.barFill, width: `${satietyPct}%`, backgroundColor: '#ff5722' }} />
                        </div>
                        <span>{Math.floor(currentSatiety)}/{maxSatiety}</span>
                    </div>
                )}

                {(currentSanity <= 0 || currentCorruption > 0) && corruption && (
                    <div style={styles.statRow}>
                        <span style={{ minWidth: '40px', color: '#9d4edd' }}>侵蚀:</span>
                        <div style={styles.barContainer}>
                            <div style={{ ...styles.barFill, width: `${corruptionPct}%`, backgroundColor: '#9d4edd' }} />
                        </div>
                        <span style={{color: '#9d4edd'}}>{Math.floor(currentCorruption)}/{maxCorruption}</span>
                    </div>
                )}

                {/* Inventory Display */}
                {entity?.inventory && entity.inventory.food > 0 && (
                     <div style={{ ...styles.statRow, color: '#ffd700' }}>
                        <span style={{ minWidth: '40px' }}>携带:</span>
                        <span>食物 x{entity.inventory.food}</span>
                     </div>
                )}

                {occupiedText && (
                    <div style={{ ...styles.statRow, color: '#aaa', fontStyle: 'italic' }}>
                        {occupiedText}
                    </div>
                )}

                {/* Current Action Display */}
                {currentAction && (
                    <div style={{ ...styles.statRow, marginTop: '4px', color: '#ffd700' }}>
                        <span style={{ minWidth: '40px' }}>状态:</span>
                        <span>{currentAction}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
