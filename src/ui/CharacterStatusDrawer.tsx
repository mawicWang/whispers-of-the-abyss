import React, { useEffect, useState } from 'react';
import { useGameStore } from '../state/store';
import { ecs } from '../entities';
import type { Entity } from '../entities';

export const CharacterStatusDrawer: React.FC = () => {
    const selectedEntityId = useGameStore((state) => state.selectedEntityId);
    const avatarImage = useGameStore((state) => state.avatarImage);
    const [entity, setEntity] = useState<Entity | null>(null);
    const [occupantName, setOccupantName] = useState<string | null>(null);

    // Poll for entity updates
    useEffect(() => {
        let interval: any;
        if (selectedEntityId) {
            const updateEntity = () => {
                const found = ecs.entities.find(e => e.id === selectedEntityId);
                if (found) {
                    setEntity({ ...found });

                    // Resolve occupant name if applicable
                    const occupantId = found.smartObject?.slots?.[0]?.claimedBy;
                    if (occupantId) {
                        const occupant = ecs.entities.find(e => e.id === occupantId);
                        setOccupantName(occupant?.name || occupant?.id || 'Unknown');
                    } else {
                        setOccupantName(null);
                    }
                } else {
                    setEntity(null);
                }
            };

            updateEntity();
            interval = setInterval(updateEntity, 100);
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

    const styles: Record<string, React.CSSProperties> = {
        drawer: {
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '190px',
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
            gap: '6px'
        },
        statRow: {
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        barContainer: {
            width: '150px',
            height: '10px',
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
        }
    };

    if (!entity && !isOpen) return null;

    // --- Render Logic Based on Entity Type ---

    const renderHouse = () => {
        const foodCount = entity?.storage?.['food'] || 0;
        return (
            <div style={styles.statsContainer}>
                <div style={{ fontSize: '18px', color: '#ffb74d' }}>
                    {entity?.name || 'House'}
                </div>
                <div style={styles.statRow}>
                    <span style={{color: '#aaa'}}>储存 (Storage):</span>
                </div>
                <div style={styles.statRow}>
                     <span style={{ fontSize: '16px' }}>🍞 食物 (Food): {foodCount}</span>
                </div>
            </div>
        );
    };

    const renderWheat = () => {
        const stage = entity?.growth?.stage ?? 0;
        const maxStage = entity?.growth?.maxStage ?? 4;
        const isMature = stage >= maxStage;
        return (
             <div style={styles.statsContainer}>
                 <div style={{ fontSize: '18px', color: '#8d6e63' }}>
                     {entity?.name || 'Wheat Field'}
                 </div>
                 <div style={styles.statRow}>
                     <span>生长阶段 (Stage):</span>
                     <span style={{ color: isMature ? '#4caf50' : '#fff' }}>
                        {stage} / {maxStage} {isMature && '(Mature)'}
                     </span>
                 </div>
             </div>
        );
    };

    const renderObject = () => {
        let description = entity?.smartObject?.interactionType || 'Interaction Point';
        if (entity?.name === '篝火') description = '提供温暖和娱乐 (Rest Area)';
        if (entity?.name === '神像') description = '供人膜拜的地方 (Worship Site)';

        return (
             <div style={styles.statsContainer}>
                 <div style={{ fontSize: '18px', color: '#cccccc' }}>
                     {entity?.name || 'Interactive Object'}
                 </div>
                 <div style={styles.statRow}>
                    <span style={{fontStyle: 'italic', color: '#888'}}>
                        {description}
                    </span>
                 </div>
                 {occupantName && (
                     <div style={styles.statRow}>
                         <span style={{color: '#aaa'}}>Occupied by:</span>
                         <span style={{color: '#fff'}}>{occupantName}</span>
                     </div>
                 )}
                 {!occupantName && (
                     <div style={styles.statRow}>
                         <span style={{color: '#4caf50'}}>Available</span>
                     </div>
                 )}
             </div>
        );
    };

    const renderNPC = () => {
        const sanity = entity?.attributes?.sanity;
        const currentSanity = sanity?.current ?? 0;
        const maxSanity = sanity?.max ?? 100;
        const sanityPct = Math.max(0, Math.min(100, (currentSanity / maxSanity) * 100));

        const stamina = entity?.attributes?.stamina;
        const currentStamina = stamina?.current ?? 0;
        const maxStamina = stamina?.max ?? 10;
        const staminaPct = Math.max(0, Math.min(100, (currentStamina / maxStamina) * 100));

        const boredom = entity?.attributes?.boredom;
        const currentBoredom = boredom?.current ?? 0;
        const maxBoredom = boredom?.max ?? 100;
        const boredomPct = Math.max(0, Math.min(100, (currentBoredom / maxBoredom) * 100));

        const satiety = entity?.attributes?.satiety;
        const currentSatiety = satiety?.current ?? 0;
        const maxSatiety = satiety?.max ?? 100;
        const satietyPct = Math.max(0, Math.min(100, (currentSatiety / maxSatiety) * 100));

        const corruption = entity?.attributes?.corruption;
        const currentCorruption = corruption?.current ?? 0;
        const maxCorruption = corruption?.max ?? 100;
        const corruptionPct = Math.max(0, Math.min(100, (currentCorruption / maxCorruption) * 100));

        // Determine Title and Color
        let title = '';
        let nameColor = '#ffffff';
        const isCorrupted = currentSanity <= 0;

        if (isCorrupted) {
            if (currentCorruption >= 100) {
                 title = '代行者 (Avatar)'; nameColor = '#ff4500';
            } else if (currentCorruption >= 81) {
                 title = '先驱 (Harbinger)'; nameColor = '#9d4edd';
            } else if (currentCorruption >= 51) {
                 title = '狂信徒 (Zealot)'; nameColor = '#2196f3';
            } else if (currentCorruption >= 21) {
                 title = '受膏者 (Anointed)'; nameColor = '#4caf50';
            } else {
                 title = '聆听者 (Listener)'; nameColor = '#ffffff';
            }
        }

        const currentAction = entity?.goap?.currentActionName;

        return (
            <div style={styles.statsContainer}>
                <div style={{ fontSize: '18px', color: nameColor, display: 'flex', alignItems: 'baseline', minWidth: '300px' }}>
                     {entity?.id || 'Unknown'}
                     {title && <span style={styles.titleText}>{title}</span>}
                </div>

                {/* Debuffs */}
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

                {!isCorrupted && (
                    <div style={styles.statRow}>
                        <span style={{ minWidth: '50px' }}>理智:</span>
                        <div style={styles.barContainer}>
                            <div style={{ ...styles.barFill, width: `${sanityPct}%`, backgroundColor: '#4fc3f7' }} />
                        </div>
                        <span>{Math.floor(currentSanity)}/{maxSanity}</span>
                    </div>
                )}

                {stamina && (
                    <div style={styles.statRow}>
                        <span style={{ minWidth: '50px' }}>精力:</span>
                        <div style={styles.barContainer}>
                            <div style={{ ...styles.barFill, width: `${staminaPct}%`, backgroundColor: '#4caf50' }} />
                        </div>
                        <span>{Math.floor(currentStamina)}/{maxStamina}</span>
                    </div>
                )}

                {boredom && (
                    <div style={styles.statRow}>
                        <span style={{ minWidth: '50px' }}>无聊:</span>
                        <div style={styles.barContainer}>
                            <div style={{ ...styles.barFill, width: `${boredomPct}%`, backgroundColor: '#ff9800' }} />
                        </div>
                        <span>{Math.floor(currentBoredom)}/{maxBoredom}</span>
                    </div>
                )}

                {satiety && (
                    <div style={styles.statRow}>
                        <span style={{ minWidth: '50px' }}>饱腹:</span>
                        <div style={styles.barContainer}>
                            <div style={{ ...styles.barFill, width: `${satietyPct}%`, backgroundColor: '#ffb74d' }} />
                        </div>
                        <span>{Math.floor(currentSatiety)}/{maxSatiety}</span>
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

                {currentAction && (
                    <div style={{ ...styles.statRow, marginTop: '4px', color: '#ffd700' }}>
                        <span style={{ minWidth: '50px' }}>状态:</span>
                        <span>{currentAction}</span>
                    </div>
                )}
            </div>
        );
    };

    // Dispatcher
    let mainContent;
    if (entity?.isHouse) {
        mainContent = renderHouse();
    } else if (entity?.isWheat) {
        mainContent = renderWheat();
    } else if (entity?.isObject && !entity?.isNPC) {
        mainContent = renderObject();
    } else {
        mainContent = renderNPC();
    }

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
            {mainContent}
        </div>
    );
};
