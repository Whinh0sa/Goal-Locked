import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { LeaderboardUI } from './LeaderboardUI';
import { EliminationFeed } from './EliminationFeed';

function CameraModeUI() {
  const { cameraMode, cycleCameraMode, gameStarted } = useGameStore();

  if (!gameStarted) return null;

  return (
    <div
      onClick={cycleCameraMode}
      style={{
        padding: '12px 24px',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '16px',
        color: '#fff',
        fontFamily: '"Poppins", sans-serif',
        fontSize: '0.75rem',
        fontWeight: 700,
        letterSpacing: '0.1em',
        cursor: 'pointer',
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        userSelect: 'none',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        width: '100%',
        boxSizing: 'border-box'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <span style={{ opacity: 0.5, fontSize: '0.65rem' }}>VIEW:</span>
      <span style={{ color: '#00eeff' }}>{cameraMode}</span>
    </div>
  );
}

function ZoomSliderHUD() {
  const gameStarted   = useGameStore(s => s.gameStarted);
  const zoomOffset    = useGameStore(s => s.zoomOffset);
  const setZoomOffset = useGameStore(s => s.setZoomOffset);

  if (!gameStarted) return null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      pointerEvents: 'auto',
      width: '100%',
    }}>
      {/* Card wrapper */}
      <div style={{
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 16,
        padding: '14px 10px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <span style={{
          fontSize: '0.65rem',
          fontFamily: '"Poppins", sans-serif',
          fontWeight: 700,
          letterSpacing: '0.12em',
          color: 'rgba(0,238,255,0.7)',
          textTransform: 'uppercase',
        }}>ZOOM</span>

        <input
          type="range"
          min={0}
          max={50}
          step={1}
          value={zoomOffset}
          onChange={e => setZoomOffset(Number(e.target.value))}
          style={{
            cursor: 'pointer',
            accentColor: '#00eeff',
            background: 'transparent',
            flexGrow: 1
          }}
        />
      </div>
    </div>
  );
}

export function CommandCenter() {
  const isHudOpen = useGameStore(s => s.isHudOpen);
  
  if (!isHudOpen) return null;
  
  return (
    <div style={{
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: '320px',
      background: 'rgba(11, 11, 11, 0.85)',
      borderLeft: '2px solid #32CD32',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      padding: '80px 16px 16px 16px',
      overflowY: 'auto',
      zIndex: 400,
      backdropFilter: 'blur(12px)',
      boxShadow: '-10px 0 50px rgba(50, 205, 50, 0.1)',
      pointerEvents: 'auto'
    }}>
      <h2 style={{
        marginTop: 0,
        marginBottom: 8,
        color: '#fff',
        fontFamily: '"Poppins", sans-serif',
        fontSize: '1rem',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        paddingBottom: 8
      }}>
        Command Center
      </h2>
      
      <div style={{ position: 'relative', width: '100%', minHeight: '150px' }}>
        {/* We strip 'fixed' positions from these if needed inside their files, 
            or position them relatively inside this container via CSS classes 
            if they use fixed positioning. For now we will render them and then 
            update LeaderboardUI/EliminationFeed if necessary. */}
        <LeaderboardUI />
      </div>
      
      <div style={{ position: 'relative', width: '100%', minHeight: '150px' }}>
        <EliminationFeed />
      </div>
      
      <CameraModeUI />
      <ZoomSliderHUD />
    </div>
  );
}
