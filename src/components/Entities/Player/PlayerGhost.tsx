interface PlayerGhostProps {
  playerColor: string;
}

export const PlayerGhost = ({ playerColor }: PlayerGhostProps) => {
  return (
    <>
      <mesh>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          color={playerColor}
          emissive={playerColor}
          emissiveIntensity={0.5}
          transparent
          opacity={0.22}
          depthWrite={false}
        />
      </mesh>
      {/* Faint ring so ghost is identifiable */}
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[1.5, 0.05, 8, 48]} />
        <meshStandardMaterial
          color={playerColor}
          emissive={playerColor}
          emissiveIntensity={1}
          transparent
          opacity={0.35}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </>
  );
};
