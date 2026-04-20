import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';

export const MobileControls = () => {
    const { setMoveDirection, triggerPulse, gameStarted } = useGameStore();
    const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });

    // Render on ALL screens when game is started — no touch detection gate.
    // This lets desktop mobile-view testing work immediately.
    // Controls are hidden at > 768px via CSS media query approach (pointer-events still null on desktop).
    if (!gameStarted) return null;

    const handleJoystickMove = (e: React.TouchEvent | React.MouseEvent) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let clientX: number, clientY: number;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        let dx = clientX - centerX;
        let dy = clientY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxRadius = rect.width / 2;

        if (distance > maxRadius) {
            dx = (dx / distance) * maxRadius;
            dy = (dy / distance) * maxRadius;
        }

        setKnobPos({ x: dx, y: dy });
        setMoveDirection([dx / maxRadius, dy / maxRadius]);
    };

    const handleJoystickEnd = () => {
        setKnobPos({ x: 0, y: 0 });
        setMoveDirection([0, 0]);
    };

    return (
        <div
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

            {/* Right Zone: Pulse Button */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    right: 0,
                    width: '50%',
                    pointerEvents: 'auto',
                    touchAction: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    padding: 48,
                }}
                onTouchStart={() => triggerPulse()}
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <motion.div
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
                    <span style={{ marginTop: 16, fontFamily: 'monospace', fontSize: 10, color: 'rgba(0,128,128,0.4)', textTransform: 'uppercase', letterSpacing: '0.4em' }}>Trigger_Overload</span>
                </div>
            </div>
        </div>
    );
};
