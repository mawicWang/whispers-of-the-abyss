
// Add PixiJS custom elements to JSX
declare global {
    namespace JSX {
        interface IntrinsicElements {
            pixiViewport: any;
        }
    }
}

export {};
