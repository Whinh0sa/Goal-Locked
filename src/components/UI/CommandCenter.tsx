import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { LeaderboardUI } from './LeaderboardUI';
import { useShallow } from 'zustand/react/shallow';

function CameraModeUI() {
  const { cameraMode, cycleCameraMode, gameStarted } = useGameStore(useShallow(state => ({
    cameraMode: state.cameraMode,
    cycleCameraMode: state.cycleCameraMode,
    gameStarted: state.gameStarted
  })));

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
  const { isHudOpen, isPaused, togglePause, toggleHud, gameStarted, graphicsMode, toggleGraphics } = useGameStore(useShallow(state => ({
    isHudOpen: state.isHudOpen,
    isPaused: state.isPaused,
    togglePause: state.togglePause,
    toggleHud: state.toggleHud,
    gameStarted: state.gameStarted,
    graphicsMode: state.graphicsMode,
    toggleGraphics: state.toggleGraphics
  })));
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
  
  // Logic Bifurcation
  const shouldRender = (isMobile ? isPaused : isHudOpen) && gameStarted;
  if (!shouldRender) return null;

  const desktopStyle: React.CSSProperties = {
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
  };

  const mobileStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    width: '100vw',
    height: '100dvh',
    backgroundColor: 'rgba(11, 11, 11, 0.95)',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'auto',
    boxSizing: 'border-box',
    padding: '24px',
  };

  const GraphicsButton = () => (
    <div
      onClick={toggleGraphics}
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
    >
      <span style={{ opacity: 0.5, fontSize: '0.65rem' }}>GRAPHICS:</span>
      <span style={{ color: graphicsMode === 'QUALITY' ? '#00eeff' : '#32CD32' }}>{graphicsMode}</span>
    </div>
  );

  return (
    <div style={isMobile ? mobileStyle : desktopStyle}>
      <h2 style={{
        marginTop: 0,
        marginBottom: isMobile ? '1.5rem' : 8,
        color: '#fff',
        fontFamily: '"Poppins", sans-serif',
        fontSize: isMobile ? '1.5rem' : '1rem',
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        borderBottom: isMobile ? 'none' : '1px solid rgba(255,255,255,0.1)',
        paddingBottom: 8,
        textAlign: isMobile ? 'center' : 'left',
        width: '100%'
      }}>
        {isMobile ? 'COMMAND CENTER' : 'Command Center'}
      </h2>
      
      {isMobile ? (
        <>
          {/* Bifurcated Row: Stats (Left) and Controls (Right) */}
          <div style={{ display: 'flex', flexDirection: 'row', width: '90%', gap: '1.5rem', alignItems: 'flex-start' }}>
            <div style={{ flex: 1.2 }}> 
               {/* Left: Stats/Score */}
               <LeaderboardUI />
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.8rem', alignItems: 'flex-end' }}> 
                {/* Right: Zoom/Camera Toggles */}
                <CameraModeUI />
                <GraphicsButton />
                <ZoomSliderHUD />
            </div>
          </div>

          {/* RESUME GAME button */}
          <button
            onClick={() => {
              togglePause();
              toggleHud();
            }}
            style={{
              width: '90%',
              padding: '1rem',
              backgroundColor: '#32CD32',
              color: '#0B0B0B',
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 900,
              borderRadius: '12px',
              border: 'none',
              textTransform: 'uppercase',
              fontSize: '1.1rem',
              letterSpacing: '0.1em',
              cursor: 'pointer',
              boxShadow: '0 0 30px rgba(50, 205, 50, 0.4)',
              marginTop: '2rem',
              pointerEvents: 'auto',
            }}
          >
            ▶ RESUME GAME
          </button>
        </>
      ) : (
        <>
          <div style={{ position: 'relative', width: '100%', minHeight: '120px' }}>
            <LeaderboardUI />
          </div>
          <div style={{ width: '100%' }}>
            <CameraModeUI />
          </div>
          <div style={{ width: '100%' }}>
            <GraphicsButton />
          </div>
          <div style={{ width: '100%' }}>
            <ZoomSliderHUD />
          </div>
        </>
      )}
    </div>
  );
}

