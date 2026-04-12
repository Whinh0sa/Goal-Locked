import { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as CANNON from 'cannon-es';
import { useFrame } from '@react-three/fiber';

interface PhysicsContextType {
  world: CANNON.World;
  setTimeScale: (scale: number) => void;
}

const PhysicsContext = createContext<PhysicsContextType | null>(null);

export const PhysicsProvider = ({ children }: { children: React.ReactNode }) => {
  const [timeScale, setTimeScale] = useState(1.0);
  const worldRef = useRef(new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0),
  }));

  // Materials
  const ballMaterial = new CANNON.Material('ball');
  const playerMaterial = new CANNON.Material('player');
  const floorMaterial = new CANNON.Material('floor');

  useEffect(() => {
    const world = worldRef.current;
    
    const ballFloorContact = new CANNON.ContactMaterial(ballMaterial, floorMaterial, {
      friction: 0.1,
      restitution: 0.7,
    });
    
    const playerBallContact = new CANNON.ContactMaterial(playerMaterial, ballMaterial, {
      friction: 0.1,
      restitution: 0.9,
    });

    world.addContactMaterial(ballFloorContact);
    world.addContactMaterial(playerBallContact);
  }, []);

  useFrame((_, delta) => {
    // Apply timeScale to the physics step
    const scaledDelta = delta * timeScale;
    const step = Math.min(scaledDelta, 0.1);
    worldRef.current.step(1 / 60, step, 3);
  });

  return (
    <PhysicsContext.Provider value={{ world: worldRef.current, setTimeScale }}>
      {children}
    </PhysicsContext.Provider>
  );
};

export const usePhysics = () => {
  const context = useContext(PhysicsContext);
  if (!context) throw new Error('usePhysics must be used within PhysicsProvider');
  return context;
};
