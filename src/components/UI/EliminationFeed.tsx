import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore, EliminationEntry } from '../../store/useGameStore';

const TOAST_DURATION = 3200; // ms

export function EliminationFeed() {
  const eliminationLog = useGameStore(state => state.eliminationLog);
  const [visible, setVisible] = useState<EliminationEntry[]>([]);
  const timerRefs = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (eliminationLog.length === 0) return;

    const latest = eliminationLog[eliminationLog.length - 1];

    // Don't show duplicates if somehow the same timestamp fires twice
    if (visible.some(v => v.timestamp === latest.timestamp)) return;

    setVisible(prev => [...prev, latest]);

    // Auto-remove after duration
    const timer = setTimeout(() => {
      setVisible(prev => prev.filter(v => v.timestamp !== latest.timestamp));
      timerRefs.current.delete(latest.timestamp);
    }, TOAST_DURATION);

    timerRefs.current.set(latest.timestamp, timer);
  }, [eliminationLog]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => { timerRefs.current.forEach(t => clearTimeout(t)); };
  }, []);

  return (
    <div
      className="responsive-scale elimination-feed"
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        alignItems: 'flex-start',
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence>
        {visible.map(entry => (
          <motion.div
            key={entry.timestamp}
            initial={{ opacity: 0, x: -80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -80, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            style={{
              background:
                entry.id === 0
                  ? 'linear-gradient(135deg, rgba(180,0,0,0.92), rgba(80,0,0,0.95))'
                  : entry.id === -1
                  ? 'linear-gradient(135deg, rgba(90,30,160,0.9), rgba(50,0,120,0.95))'
                  : 'linear-gradient(135deg, rgba(10,40,10,0.92), rgba(5,30,5,0.95))',
              border: `1px solid ${
                entry.id === 0 ? '#ff000055'
                : entry.id === -1 ? '#9126ef88'
                : '#32CD3255'
              }`,
              borderLeft: `4px solid ${
                entry.id === 0 ? '#FF3B3B'
                : entry.id === -1 ? '#9126EF'
                : '#32CD32'
              }`,
              borderRadius: 10,
              padding: '10px 18px',
              fontFamily: '"Poppins", sans-serif',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#fff',
              backdropFilter: 'blur(12px)',
              boxShadow: `0 4px 24px ${
                entry.id === 0 ? 'rgba(255,59,59,0.35)'
                : entry.id === -1 ? 'rgba(145,38,239,0.3)'
                : 'rgba(50,205,50,0.25)'
              }`,
              minWidth: 220,
              whiteSpace: 'nowrap',
              userSelect: 'none',
            }}
          >
            {/* Bold the first word (GOAL! / GAME / 🛡) */}
            {(() => {
              const [first, ...rest] = entry.message.split(' ');
              const accent = entry.id === 0 ? '#FF3B3B' : entry.id === -1 ? '#c084fc' : '#32CD32';
              return (
                <>
                  <span style={{ color: accent }}>{first}</span>{' '}{rest.join(' ')}
                </>
              );
            })()}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
