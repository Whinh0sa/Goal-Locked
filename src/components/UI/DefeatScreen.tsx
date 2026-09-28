import React from 'react';
import { OVERLAY_BASE } from './overlayStyles';

export function DefeatScreen({ onReset, score }: { onReset: () => void; score: number }) {
    return (
        <div style={{
            ...OVERLAY_BASE,
            background: 'radial-gradient(ellipse at center, rgba(255,0,0,0.12) 0%, rgba(0,0,0,0.82) 60%)',
        }}>
            <div style={{ textAlign: 'center', pointerEvents: 'auto' }}>
                <div style={{ fontSize: '3rem', fontWeight: 900, color: '#ff3b3b', textShadow: '0 0 40px rgba(255,59,59,0.5)' }}>
                    ELIMINATED
                </div>
                <div style={{ color: '#cbd5e1', fontSize: '1rem', marginTop: 8 }}>Tier Progress Halted</div>
                <div style={{ color: '#ff3b3b', fontSize: '1.8rem', fontWeight: 900, marginTop: 12 }}>SCORE: {score}</div>
                <button
                    onClick={onReset}
                    style={{
                        marginTop: 32,
                        padding: '16px 56px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: 12,
                        color: '#fff',
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        cursor: 'pointer',
                        backdropFilter: 'blur(10px)',
                        touchAction: 'manipulation',
                    }}
                >
                    Try Again
                </button>
            </div>
        </div>
    );
}
