import React from 'react';

export const OVERLAY_BASE: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100vw',
    height: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '"Poppins", sans-serif',
    zIndex: 50,
    overflow: 'hidden',
    // Let touches through to the canvas when this overlay is transparent
    pointerEvents: 'none',
};
