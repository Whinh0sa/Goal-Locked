import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';

export const LeaderboardUI = () => {
    const { playerKills, remainingPlayers, gameStarted, score, highScore, tier } = useGameStore(useShallow(state => ({
    playerKills: state.playerKills, remainingPlayers: state.remainingPlayers, gameStarted: state.gameStarted, score: state.score, highScore: state.highScore, tier: state.tier
  })));

    if (!gameStarted) return null;

    return (
        <div 
            className="responsive-scale leaderboard"
            style={{
                position: 'relative',
                zIndex: 1000,
                background: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '12px 20px',
                fontFamily: '"Poppins", sans-serif',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                minWidth: '180px',
                pointerEvents: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                textTransform: 'uppercase',
            }}
        >
            {/* Header: Tier */}
            <div style={{ textAlign: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: '12px', color: '#FFBF00', fontWeight: 900, letterSpacing: '0.1em' }}>CRUCIBLE TIER {tier}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#aaaaaa', fontWeight: 600 }}>Score</span>
                <span style={{ fontSize: '18px', color: '#ffffff', fontWeight: 800 }}>{score}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#666666', fontWeight: 600 }}>Best</span>
                <span style={{ fontSize: '14px', color: '#FFBF00', fontWeight: 700 }}>{highScore}</span>
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', width: '100%', margin: '4px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#aaaaaa', fontWeight: 600 }}>Alive</span>
                <span style={{ fontSize: '18px', color: '#32CD32', fontWeight: 800 }}>{remainingPlayers}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#aaaaaa', fontWeight: 600 }}>Kills</span>
                <span style={{ fontSize: '18px', color: '#ff3b3b', fontWeight: 800 }}>{playerKills}</span>
            </div>
        </div>
    );
};
