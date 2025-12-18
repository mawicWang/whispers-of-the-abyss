import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../state/store';
import { ecs } from '../../ecs/world';
import type { Entity } from '../../ecs/types';

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
            alignItems: 'flex-start',
            padding: '16px',
            boxSizing: 'border-box',
            zIndex: 1000,
            color: '#fff',
            fontFamily: 'system-ui, "Segoe UI", Roboto, sans-serif, monospace',
            imageRendering: 'pixelated',
            boxShadow: '0 4px 8px rgba(0,0,0,0.5)',
            gap: '24px'
        },
        // Left Column: Avatar & Basic Info
        leftColumn: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '85px',
            flexShrink: 0
        },
        nameTitle: {
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#fff',
            marginBottom: '4px',
            textAlign: 'center',
            width: '100%',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
        },
        titleText: {
            fontSize: '12px',
            color: '#aaa',
            fontStyle: 'italic',
            marginBottom: '4px'
        },
        portraitContainer: {
            width: '75px',
            height: '75px',
            backgroundColor: '#000',
            border: '2px solid #6d6d8d',
            borderRadius: '4px',
            flexShrink: 0,
            overflow: 'hidden',
            position: 'relative',
            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
            imageRendering: 'pixelated',
            marginBottom: '4px'
        },
        actionText: {
            fontSize: '12px',
            color: '#ffd700',
            textAlign: 'center',
            marginTop: '4px'
        },

        // Middle Column: Stats (Value)
        middleColumn: {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            width: '80px',
            flexShrink: 0,
            paddingTop: '24px' // Align visually with avatar somewhat
        },
        statValueRow: {
            fontSize: '14px',
            color: '#ddd',
            display: 'flex',
            justifyContent: 'space-between',
            borderBottom: '1px solid #444',
            paddingBottom: '2px'
        },

        // Right Column: Points (Bars)
        rightColumn: {
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            flexGrow: 1,
            paddingTop: '4px'
        },
        pointRow: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px'
        },
        label: {
            width: '40px',
            textAlign: 'right',
            color: '#aaa'
        },
        barContainer: {
            flexGrow: 1,
            height: '16px',
            backgroundColor: '#333',
            border: '1px solid #555',
            position: 'relative',
            maxWidth: '200px'
        },
        barFill: {
            height: '100%',
            transition: 'width 0.2s'
        },
        // Fallback for non-NPCs
        simpleContainer: {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
        }
    };

    if (!entity && !isOpen) return null;

    // --- Render Logic Based on Entity Type ---

    const renderHouse = () => {
        const foodCount = entity?.storage?.['food'] || 0;
        return (
            <div style={styles.simpleContainer}>
                <div style={{ fontSize: '18px', color: '#ffb74d' }}>
                    {entity?.name || 'House'}
                </div>
                <div>
                     <span style={{ fontSize: '16px' }}>🍞 食物: {foodCount}</span>
                </div>
            </div>
        );
    };

    const renderWheat = () => {
        const stage = entity?.growth?.stage ?? 0;
        const maxStage = entity?.growth?.maxStage ?? 4;
        const isMature = stage >= maxStage;
        return (
             <div style={styles.simpleContainer}>
                 <div style={{ fontSize: '18px', color: '#8d6e63' }}>
                     {entity?.name || 'Wheat Field'}
                 </div>
                 <div>
                     <span>生长阶段: </span>
                     <span style={{ color: isMature ? '#4caf50' : '#fff' }}>
                        {stage} / {maxStage} {isMature && '(Mature)'}
                     </span>
                 </div>
             </div>
        );
    };

    const renderObject = () => {
        let description = entity?.smartObject?.interactionType || 'Interaction Point';
        if (entity?.name === '篝火') description = '提供温暖和娱乐';
        if (entity?.name === '神像') description = '供人膜拜的地方';

        return (
             <div style={styles.simpleContainer}>
                 <div style={{ fontSize: '18px', color: '#cccccc' }}>
                     {entity?.name || 'Interactive Object'}
                 </div>
                 <div style={{fontStyle: 'italic', color: '#888'}}>
                        {description}
                 </div>
                 {occupantName ? (
                     <div>
                         <span style={{color: '#aaa'}}>Occupied by: </span>
                         <span style={{color: '#fff'}}>{occupantName}</span>
                     </div>
                 ) : (
                     <div style={{color: '#4caf50'}}>Available</div>
                 )}
             </div>
        );
    };

    const renderNPC = () => {
        const attrs = entity?.attributes || {} as Partial<NonNullable<Entity['attributes']>>;
        const {
            might = 0, magic = 0, will = 0,
            health, sanity, stamina, corruption, boredom, satiety
        } = attrs;

        // Points Normalization
        const getPct = (current: number = 0, max: number = 100) => Math.max(0, Math.min(100, (current / max) * 100));

        // Determine Title and Color based on Corruption/Sanity
        let title = 'Worker'; // Default title
        let nameColor = '#ffffff';
        const isCorrupted = (sanity?.current ?? 0) <= 0;
        const currentCorruption = corruption?.current ?? 0;

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

        const currentAction = entity?.goap?.currentActionName || 'Idle';

        // Render Helper for Point Bars
        const renderBar = (label: string, current: number | undefined, max: number | undefined, color: string) => {
            if (current === undefined || max === undefined) return null;
            const pct = getPct(current, max);
            return (
                <div style={styles.pointRow}>
                    <span style={{...styles.label, color: color}}>{label}:</span>
                    <div style={styles.barContainer}>
                        <div style={{ ...styles.barFill, width: `${pct}%`, backgroundColor: color }} />
                        <span style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            color: '#fff',
                            textShadow: '1px 1px 2px #000',
                            pointerEvents: 'none'
                        }}>
                           {Math.floor(current)}/{max}
                        </span>
                    </div>
                </div>
            );
        };

        return (
            <>
                {/* Left Column: Avatar */}
                <div style={styles.leftColumn}>
                    <div style={{...styles.nameTitle, color: nameColor}}>{entity?.name || entity?.id || 'Unknown'}</div>
                    <div style={styles.titleText}>{title}</div>
                    <div style={styles.portraitContainer}>
                        {avatarImage && (
                            <img
                                src={avatarImage}
                                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                                alt="Target"
                            />
                        )}
                    </div>
                    <div style={styles.actionText}>{currentAction}</div>

                    {/* Debuffs */}
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                         {entity?.debuffs && entity.debuffs.map((debuff, i) => (
                            <div key={i} title={`${debuff.type} (${Math.ceil(debuff.duration)}s)`} style={{
                                width: '16px', height: '16px',
                                backgroundImage: `url(${getDebuffIconUrl(debuff.icon)})`,
                                backgroundSize: 'contain',
                                border: '1px solid #555'
                            }} />
                         ))}
                    </div>
                </div>

                {/* Middle Column: Stats */}
                <div style={styles.middleColumn}>
                    <div style={styles.statValueRow}>
                        <span>武力</span>
                        <span>{might}</span>
                    </div>
                    <div style={styles.statValueRow}>
                        <span>魔力</span>
                        <span>{magic}</span>
                    </div>
                    <div style={styles.statValueRow}>
                        <span>意志</span>
                        <span>{will}</span>
                    </div>
                </div>

                {/* Right Column: Points */}
                <div style={styles.rightColumn}>
                    {renderBar('生命', health?.current, health?.max, '#f44336')}
                    {renderBar('理智', sanity?.current, sanity?.max, '#4fc3f7')}
                    {renderBar('腐蚀', corruption?.current, corruption?.max, '#9d4edd')}
                    {renderBar('饱腹', satiety?.current, satiety?.max, '#ffb74d')}
                    {renderBar('精力', stamina?.current, stamina?.max, '#4caf50')}
                    {renderBar('无聊', boredom?.current, boredom?.max, '#ff9800')}
                </div>
            </>
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
            {/* If it's not an NPC, we might want a different layout, or just stuff it in the middle */}
            {(!entity?.isNPC) ? (
                <>
                     <div style={styles.leftColumn}>
                        <div style={styles.portraitContainer}>
                            {avatarImage && (
                                <img
                                    src={avatarImage}
                                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                                    alt="Target"
                                />
                            )}
                        </div>
                     </div>
                     {mainContent}
                </>
            ) : (
                mainContent
            )}
        </div>
    );
};
