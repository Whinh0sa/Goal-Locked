import React from 'react';
import { Stats } from '../../hooks/useStats';
import { OVERLAY_BASE } from './overlayStyles';

export function StartScreen({ onStart, tier }: { onStart: () => void; tier: number }) {
    const stats = Stats.load();
    const [isMobile, setIsMobile] = React.useState(typeof window !== 'undefined' && window.innerWidth < 1024);
    const [isShort, setIsShort] = React.useState(typeof window !== 'undefined' && window.innerHeight < 550);

    React.useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 1024);
            setIsShort(window.innerHeight < 550);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const enterFullscreen = () => {
        const elem = document.documentElement;
        if (elem.requestFullscreen) elem.requestFullscreen();
        // @ts-ignore
        else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
    };

    return (
        <div style={{
            ...OVERLAY_BASE,
            background: 'radial-gradient(ellipse at center, rgba(0,100,255,0.15) 0%, rgba(0,0,0,0.75) 60%)',
        }}>
            <div style={{
                textAlign: 'center',
                pointerEvents: 'auto',
                width: '100%',
                maxWidth: '600px',
                padding: '0 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: isShort ? '8px' : '12px'
            }}>
                {tier > 1 && !isShort && (
                    <div style={{
                        display: 'inline-block',
                        background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                        color: '#000',
                        fontWeight: 900,
                        fontSize: '0.75rem',
                        letterSpacing: '0.15em',
                        padding: '4px 16px',
                        borderRadius: 999,
                        marginBottom: isShort ? 4 : 12,
                        boxShadow: '0 0 20px rgba(251,191,36,0.6)',
                    }}>⚔️ TIER {tier} — ESCALATED DIFFICULTY</div>
                )}
                <div style={{
                    fontSize: isShort ? '2.2rem' : (isMobile ? 'clamp(2.2rem, 12vw, 3.5rem)' : 'clamp(3.5rem, 8vw, 5rem)'),
                    fontWeight: 900,
                    color: '#fff',
                    lineHeight: 1.1,
                    textShadow: '0 0 60px rgba(100,180,255,0.6)',
                    whiteSpace: 'nowrap',
                    width: '100%',
                    display: 'block',
                    marginTop: 0,
                    marginBottom: 0
                }}>
                    ⚽ Goal-Locked
                </div>
                {!isShort && (
                    <div style={{ fontSize: isMobile ? '0.9rem' : '1.1rem', color: '#7dd3fc', marginTop: 4, fontWeight: 600, letterSpacing: '0.1em' }}>
                        Football Battle Royale
                    </div>
                )}

                {/* Instructions Overlay */}
                <div style={{
                    marginTop: isShort ? 4 : 16,
                    padding: isShort ? '8px 16px' : '16px 24px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    backdropFilter: 'blur(12px)',
                    textAlign: 'left',
                    margin: isShort ? '4px auto' : '16px auto',
                    maxWidth: isShort ? '400px' : '440px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                }}>
                    <div style={{
                        fontSize: isShort ? '0.9rem' : '1.3rem',
                        color: '#00eeff',
                        fontWeight: 900,
                        letterSpacing: '0.05em',
                        marginBottom: isShort ? '6px' : '16px'
                    }}>
                        INSTRUCTIONS
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: isShort ? '4px' : '10px' }}>
                        <div style={{ fontSize: isShort ? '0.75rem' : '0.85rem', color: '#fff' }}>
                            <span style={{ color: '#00eeff', fontWeight: 900, marginRight: '8px' }}>OBJECTIVE:</span> Be the last sphere standing.
                        </div>
                        <div style={{ fontSize: isShort ? '0.7rem' : '0.8rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                            <span style={{ color: '#00eeff', fontWeight: 700, marginRight: '8px' }}>TACTICS:</span> {isMobile ? "Tap [PULSE] to strike." : "Use [SPACEBAR] to pulse."}
                        </div>
                        <div style={{ fontSize: isShort ? '0.7rem' : '0.8rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                            <span style={{ color: '#00eeff', fontWeight: 700, marginRight: '8px' }}>MOVE:</span> {isMobile ? "Virtual Joystick." : "[WASD] or [ARROWS]."}
                        </div>
                        <div style={{ fontSize: isShort ? '0.7rem' : '0.8rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                            <span style={{ color: '#00eeff', fontWeight: 700, marginRight: '8px' }}>DASH:</span> {isMobile ? "Press [DASH]." : "Press [SHIFT]."}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: isShort ? 8 : (isMobile ? 12 : 24), justifyContent: 'center', marginTop: 0 }}>
                    {[
                        { label: 'BEST', value: stats.highestScore.toString() },
                        { label: 'KILLS', value: stats.totalBotsDeleted.toString() },
                        { label: 'TIER', value: `T${stats.highestTier}` },
                    ].map(s => (
                        <div key={s.label} style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 10,
                            padding: isShort ? '4px 10px' : (isMobile ? '8px 12px' : '10px 20px'),
                            minWidth: isShort ? 60 : (isMobile ? 70 : 90),
                        }}>
                            <div style={{ fontSize: isShort ? '0.8rem' : (isMobile ? '0.9rem' : '1.1rem'), fontWeight: 700, color: '#fff' }}>{s.value}</div>
                            <div style={{ fontSize: '0.5rem', color: 'rgba(180,220,255,0.5)', letterSpacing: '0.12em', marginTop: 1 }}>{s.label}</div>
                        </div>
                    ))}
                </div>
                <button
                    onClick={() => {
                        enterFullscreen();
                        onStart();
                    }}
                    style={{
                        marginTop: isShort ? 8 : 20,
                        padding: isShort ? '10px 32px' : (isMobile ? '14px 40px' : '16px 56px'),
                        background: tier > 1
                            ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                            : 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                        border: 'none',
                        borderRadius: 12,
                        color: '#fff',
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 700,
                        fontSize: isShort ? '0.9rem' : (isMobile ? '1rem' : '1.1rem'),
                        letterSpacing: '0.05em',
                        cursor: 'pointer',
                        boxShadow: tier > 1
                            ? '0 0 40px rgba(245,158,11,0.5)'
                            : '0 0 40px rgba(59,130,246,0.5)',
                        transition: 'transform 0.1s, box-shadow 0.2s',
                        // Explicit touch action for mobile
                        touchAction: 'manipulation',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                    {tier > 1 ? `⚔️ Tier ${tier}` : 'Play Now'}
                </button>
            </div>
        </div>
    );
}
