import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';

export const MobileControls = () => {
    const { setMoveDirection, triggerPulse, gameStarted } = useGameStore();
    const [isMobile, setIsMobile] = useState(false);
    
    // Joystick state
    const [dragging, setDragging] = useState(false);
    const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const checkMobile = () => {
             setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (!isMobile || !gameStarted) return null;

    const handleJoystickMove = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        const rect = e.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        let dx = touch.clientX - centerX;
        let dy = touch.clientY - centerY;
        
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
        setDragging(false);
        setKnobPos({ x: 0, y: 0 });
        setMoveDirection([0, 0]);
    };

    return (
        <div className="fixed inset-0 z-[100] pointer-events-none select-none">
            {/* Left Zone: Joystick */}
            <div 
                className="absolute bottom-12 left-12 w-48 h-48 rounded-full bg-teal-500/5 border-2 border-teal-500/20 pointer-events-auto touch-none overflow-visible flex items-center justify-center"
                onTouchStart={() => setDragging(true)}
                onTouchMove={handleJoystickMove}
                onTouchEnd={handleJoystickEnd}
            >
                <motion.div 
                    animate={{ x: knobPos.x, y: knobPos.y }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="w-16 h-16 rounded-full bg-teal-500 shadow-[0_0_20px_rgba(0,128,128,0.6)] border border-white/20"
                />
                
                {/* Decorative Crosshair */}
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                     <div className="w-full h-[1px] bg-teal-500" />
                     <div className="h-full w-[1px] bg-teal-500 absolute" />
                </div>
            </div>

            {/* Right Zone: Pulse Button */}
            <div 
                className="absolute inset-y-0 right-0 w-1/2 pointer-events-auto touch-none flex items-center justify-end p-12"
                onTouchStart={() => triggerPulse()}
            >
                <div className="flex flex-col items-center">
                    <motion.div 
                        whileTap={{ scale: 0.9, backgroundColor: "rgba(0, 255, 255, 0.4)" }}
                        className="w-32 h-32 rounded-full border-4 border-teal-500/40 bg-teal-500/10 flex items-center justify-center backdrop-blur-sm"
                    >
                         <div className="text-teal-500 font-black tracking-tighter text-2xl italic">PULSE</div>
                    </motion.div>
                    <span className="mt-4 font-mono text-[10px] text-teal-500/40 uppercase tracking-[0.4em]">Trigger_Overload</span>
                </div>
            </div>
        </div>
    );
};
