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
        // Configuration to match user requirements:
        // Windows: Click-Drag Pan, Mouse Wheel Zoom
        // Mac: Click-Drag Pan, Two-finger Zoom (Pinch/Scroll)
        // Mobile: One-finger Pan, Two-finger Zoom (Pinch)
        viewport
            .drag({
                mouseButtons: 'left', // Ensure only left click drags
            })
            .pinch() // Support touch pinch on mobile
            .wheel({
                trackpadPinch: true, // Support native Mac trackpad pinch gesture (Ctrl + Wheel)
                wheelZoom: true,     // Support standard wheel zooming
            })
            .decelerate()
            .bounce();

        const onResize = () => {
             viewport.resize(app.screen.width, app.screen.height);
        };
        window.addEventListener('resize', onResize);

        // Fix for pixel jitter: Force integer coordinates during rendering
        // but preserve float coordinates for smooth movement/physics.
        const originalUpdateTransform = viewport.updateTransform;

        viewport.updateTransform = function(this: Viewport, ...args: any[]) {
            const originalX = this.x;
            const originalY = this.y;

            this.x = Math.round(this.x);
            this.y = Math.round(this.y);

            // In Pixi v8, updateTransform might take a ticker or generic args
            // We just pass them through.
            // We use 'call' to invoke the original method on 'this'
            // (Note: originalUpdateTransform might be on the prototype chain,
            //  capturing it from the instance is fine as long as it's not bound elsewhere)
            const result = originalUpdateTransform.apply(this, args as any);

            this.x = originalX;
            this.y = originalY;

            return result;
        };

        return () => window.removeEventListener('resize', onResize);
    }, [app]);

    if (!app) return null;

    // Use the registered tag 'Viewport' (matching the class name registered via extend)
    // Casting to any to avoid "Property 'Viewport' does not exist on type 'JSX.IntrinsicElements'"
    const ViewportTag = 'Viewport' as any;

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
