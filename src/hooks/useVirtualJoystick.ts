import React, { useState, useCallback } from 'react';

interface UseVirtualJoystickProps {
    onMove: (direction: [number, number]) => void;
}

export const useVirtualJoystick = ({ onMove }: UseVirtualJoystickProps) => {
    const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });

    const handleJoystickMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
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
        onMove([dx / maxRadius, dy / maxRadius]);
    }, [onMove]);

    const handleJoystickEnd = useCallback(() => {
        setKnobPos({ x: 0, y: 0 });
        onMove([0, 0]);
    }, [onMove]);

    return {
        knobPos,
        handleJoystickMove,
        handleJoystickEnd,
    };
};
