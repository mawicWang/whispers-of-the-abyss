import React, { forwardRef, useEffect, useRef } from 'react';
import { useApplication, extend } from '@pixi/react';
import { Viewport } from 'pixi-viewport';

// Register Viewport with @pixi/react
// This registers it as 'viewport' in the catalogue
extend({ Viewport });

interface PixiViewportProps {
    screenWidth?: number;
    screenHeight?: number;
    worldWidth?: number;
    worldHeight?: number;
    children?: React.ReactNode;
    [key: string]: any;
}

export const PixiViewport = forwardRef<Viewport, PixiViewportProps>((props, ref) => {
    const { app } = useApplication();
    const viewportRef = useRef<Viewport>(null);

    // Sync ref
    useEffect(() => {
        if (ref) {
            if (typeof ref === 'function') {
                ref(viewportRef.current);
            } else {
                ref.current = viewportRef.current;
            }
        }
    }, [ref]);

    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport || !app) return;

        // Apply plugins after mount
        viewport
            .drag()
            .pinch()
            .wheel()
            .decelerate()
            .bounce();

        const onResize = () => {
             viewport.resize(app.screen.width, app.screen.height);
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [app]);

    if (!app) return null;

    // Use the registered tag 'viewport'
    // Casting to any to avoid "Property 'viewport' does not exist on type 'JSX.IntrinsicElements'"
    const ViewportTag = 'viewport' as any;

    return (
        <ViewportTag
            ref={viewportRef}
            screenWidth={props.screenWidth || app.screen.width}
            screenHeight={props.screenHeight || app.screen.height}
            worldWidth={props.worldWidth || 2000}
            worldHeight={props.worldHeight || 2000}
            ticker={app.ticker}
            events={app.renderer.events}
            {...props}
        >
            {props.children}
        </ViewportTag>
    );
});
