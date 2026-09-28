import { Float } from '@react-three/drei';
import { MAX_SHIELDS } from './constants';

interface PlayerMeshProps {
  playerShields: number;
  playerColor: string;
  isJuggernaut: boolean;
}

export const PlayerMesh = ({ playerShields, playerColor, isJuggernaut }: PlayerMeshProps) => {
  return (
    <>
      {/* Shield indicator dots */}
      <group position={[0, 3.2, 0]}>
        {Array.from({ length: MAX_SHIELDS }).map((_, i) => {
          const active = i < playerShields;
          const offsetX = (i - (MAX_SHIELDS - 1) / 2) * 0.5;
          return (
            <mesh key={i} position={[offsetX, 0, 0]}>
              <sphereGeometry args={[0.12, 8, 8]} />
              <meshStandardMaterial
                color={active ? playerColor : '#1a1a1a'}
                emissive={active ? playerColor : '#000'}
                emissiveIntensity={active ? 4 : 0}
                toneMapped={false}
              />
            </mesh>
          );
        })}
      </group>

      <Float speed={4} rotationIntensity={2} floatIntensity={0.5}>
        <mesh castShadow>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial color="#0B0B0B" metalness={0.9} roughness={0.1} />
        </mesh>

        {/* Juggernaut Golden Aura */}
        {isJuggernaut && (
          <mesh>
            <sphereGeometry args={[1.2, 32, 32]} />
            <meshStandardMaterial
              color="#FFD700"
              emissive="#FFD700"
              emissiveIntensity={10}
              transparent
              opacity={0.3}
              toneMapped={false}
            />
          </mesh>
        )}

        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[1.5, 0.1, 16, 80]} />
          <meshStandardMaterial color={playerColor} emissive={playerColor} emissiveIntensity={4} toneMapped={false} />
        </mesh>
        <mesh rotation-x={Math.PI / 3}>
          <torusGeometry args={[1.5, 0.04, 8, 48]} />
          <meshStandardMaterial color={playerColor} emissive={playerColor} emissiveIntensity={2} toneMapped={false} />
        </mesh>
        <pointLight color={playerColor} intensity={3} distance={6} />
      </Float>
    </>
  );
};
