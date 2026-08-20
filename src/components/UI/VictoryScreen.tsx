import React from 'react';
import { OVERLAY_BASE } from './overlayStyles';

export function VictoryScreen({ onReset, score }: { onReset: () => void; score: number }) {
    return (
        <div style={{
            ...OVERLAY_BASE,
            background: 'radial-gradient(ellipse at center, rgba(0,100,255,0.15) 0%, rgba(0,0,0,0.80) 60%)',
        }}>
            <div style={{ textAlign: 'center', pointerEvents: 'auto' }}>
                <div style={{ fontSize: '3.5rem', fontWeight: 900, color: '#fbbf24', textShadow: '0 0 60px rgba(251,191,36,0.8)' }}>
                    🏆 You Win!
                </div>
                <div style={{ color: '#cbd5e1', fontSize: '1.2rem', marginTop: 8 }}>Tier Upgrade: Entrance Level Cleared</div>
                <div style={{ color: '#fbbf24', fontSize: '1.8rem', fontWeight: 900, marginTop: 12 }}>SCORE: {score}</div>
                <button
                    onClick={onReset}
                    style={{
                        marginTop: 32,
                        padding: '16px 56px',
                        background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                        border: 'none',
                        borderRadius: 12,
                        color: '#fff',
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        cursor: 'pointer',
                        boxShadow: '0 0 40px rgba(59,130,246,0.5)',
                        touchAction: 'manipulation',
                    }}
                >
                    Play Again
                </button>
            </div>
        </div>
    );
}
