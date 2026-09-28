import { useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../../../store/useGameStore';
import { PlayerMesh } from './PlayerMesh';
import { PlayerGhost } from './PlayerGhost';
import { usePlayerController } from './usePlayerController';

export const Player = () => {
  const groupRef = useRef<THREE.Group>(null!);
  const ghostRef = useRef<THREE.Group>(null!);

  const playerShields = useGameStore(state => state.playerShields);
  const playerColor = useGameStore(state => state.playerRingColor) || '#32CD32';

  const { isEliminated, playerJuggernautUntil } = usePlayerController(groupRef, ghostRef);

  return (
    <>
      {/* ── Active player mesh ── */}
      <group ref={groupRef}>
        {!isEliminated && (
          <PlayerMesh
            playerShields={playerShields}
            playerColor={playerColor}
            isJuggernaut={Date.now() < playerJuggernautUntil}
          />
        )}
      </group>

      {/* ── Ghost / spectator mode (shown when eliminated) ── */}
      <group ref={ghostRef} visible={false}>
        {isEliminated && <PlayerGhost playerColor={playerColor} />}
      </group>
    </>
  );
};
