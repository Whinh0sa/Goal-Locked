import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { useVirtualJoystick } from '../../hooks/useVirtualJoystick';

export const MobileControls = () => {
    const { setMoveDirection, triggerPulse, triggerDash, gameStarted } = useGameStore(useShallow(state => ({
        setMoveDirection: state.setMoveDirection,
        triggerPulse: state.triggerPulse,
        triggerDash: state.triggerDash,
        gameStarted: state.gameStarted
    })));

    const { knobPos, handleJoystickMove, handleJoystickEnd } = useVirtualJoystick({ onMove: setMoveDirection });
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 1024);

    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Only render on mobile/tablet — keyboard controls are used on desktop
    if (!gameStarted || !isMobile) return null;

    return (
        <div
            className="responsive-scale mobile-controls"
            style={{
                position: 'absolute',
                inset: 0,
                zIndex: 9999,
                pointerEvents: 'none',
                userSelect: 'none',
            }}
        >
            {/* Left Zone: Joystick — only show on small screens */}
            <div
                className="mobile-joystick-zone"
                style={{
                    position: 'absolute',
                    bottom: 48,
                    left: 48,
                    width: 192,
                    height: 192,
                    borderRadius: '50%',
                    background: 'rgba(0,128,128,0.05)',
                    border: '2px solid rgba(0,128,128,0.2)',
                    pointerEvents: 'auto',
                    touchAction: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'visible',
                }}
                onTouchMove={handleJoystickMove}
                onTouchEnd={handleJoystickEnd}
                onTouchStart={handleJoystickMove}
            >
                <motion.div
                    className="mobile-joystick-knob"
                    animate={{ x: knobPos.x, y: knobPos.y }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    style={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        background: '#008080',
                        boxShadow: '0 0 20px rgba(0,128,128,0.6)',
                        border: '1px solid rgba(255,255,255,0.2)',
                    }}
                />
                {/* Crosshair */}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2, pointerEvents: 'none' }}>
                    <div style={{ width: '100%', height: 1, background: '#008080' }} />
                    <div style={{ height: '100%', width: 1, background: '#008080', position: 'absolute' }} />
                </div>
            </div>

            {/* Right Zone: Actions */}
            <div
                className="mobile-actions-zone"
                style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    right: 0,
                    width: '50%',
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    padding: 48,
                    gap: 32,
                }}
            >
                {/* Pulse Button */}
                <div 
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'auto', touchAction: 'none' }}
                    onTouchStart={() => triggerPulse()}
                >
                    <motion.div
                        className="mobile-pulse-btn"
                        whileTap={{ scale: 0.9, backgroundColor: 'rgba(0,255,255,0.4)' }}
                        style={{
                            width: 128,
                            height: 128,
                            borderRadius: '50%',
                            border: '4px solid rgba(0,128,128,0.4)',
                            background: 'rgba(0,128,128,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backdropFilter: 'blur(4px)',
                        }}
                    >
                        <span style={{ color: '#008080', fontWeight: 900, fontSize: 24, fontStyle: 'italic', letterSpacing: '-0.05em' }}>PULSE</span>
                    </motion.div>
                </div>

                {/* Dash Button */}
                <div 
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'auto', touchAction: 'none', marginRight: 16 }}
                    onTouchStart={() => triggerDash()}
                >
                    <motion.div
                        className="mobile-dash-btn"
                        whileTap={{ scale: 0.9, backgroundColor: 'rgba(255,165,0,0.4)' }}
                        style={{
                            width: 96,
                            height: 96,
                            borderRadius: '50%',
                            border: '3px solid rgba(255,140,0,0.4)',
                            background: 'rgba(255,140,0,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backdropFilter: 'blur(4px)',
                        }}
                    >
                        <span style={{ color: '#FF8C00', fontWeight: 900, fontSize: 18, fontStyle: 'italic', letterSpacing: '-0.05em' }}>DASH</span>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};
