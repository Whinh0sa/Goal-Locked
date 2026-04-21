import React from 'react';
import { useGameStore } from '../../store/useGameStore';

export const LeaderboardUI = () => {
    const { playerKills, remainingPlayers, gameStarted, gameOver } = useGameStore();

    if (!gameStarted) return null;

    return (
        <div 
            style={{
                position: 'absolute',
                top: 24,
                right: 24,
                zIndex: 1000,
                background: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '16px 24px',
                fontFamily: '"Poppins", sans-serif',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                minWidth: '160px',
                pointerEvents: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                textTransform: 'uppercase',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#aaaaaa', fontWeight: 600 }}>Alive</span>
                <span style={{ fontSize: '20px', color: '#32CD32', fontWeight: 800 }}>{remainingPlayers}</span>
            </div>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', width: '100%' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#aaaaaa', fontWeight: 600 }}>Kills</span>
                <span style={{ fontSize: '20px', color: '#ff3b3b', fontWeight: 800 }}>{playerKills}</span>
            </div>
        </div>
    );
};
