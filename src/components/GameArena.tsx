import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RotateCcw, Move, MousePointer2 } from 'lucide-react';

// --- Constants ---
const ARENA_RADIUS = 20;
const BALL_RADIUS = 0.8;
const PLAYER_RADIUS = 1;
const GOAL_WIDTH = 6;
const GOAL_COUNT = 8;
const BOUNDARY_SEGMENTS = 64;
const POWERUP_DURATION = 8000; // 8 seconds

type PowerUpType = 'BIG_BALL' | 'SPEED_BOOST' | 'DOUBLE_KICK';

interface PowerUp {
  id: string;
  type: PowerUpType;
  mesh: THREE.Mesh;
  body: CANNON.Body;
}

export default function GameArena() {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSound = (type: 'bump' | 'explosion' | 'powerup' | 'goal', volume = 1) => {
    const ctx = audioCtxRef.current;
    if (!ctx || ctx.state === 'suspended') return;

    const masterGain = ctx.createGain();
    masterGain.gain.value = volume * 0.3;
    masterGain.connect(ctx.destination);

    if (type === 'bump') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'explosion') {
      const bufferSize = ctx.sampleRate * 1.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 1.5);
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      noise.start();
    } else if (type === 'powerup') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'goal') {
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + i * 0.1 + 0.05);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.1 + 0.2);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.2);
      });
    }
  };

  const [score, setScore] = useState<number[]>(new Array(GOAL_COUNT).fill(0));
  const [eliminated, setEliminated] = useState<boolean[]>(new Array(GOAL_COUNT).fill(false));
  const [activePowerUps, setActivePowerUps] = useState<{ [key in PowerUpType]?: boolean }>({});
  const [gameStarted, setGameStarted] = useState(false);
  const [lastGoal, setLastGoal] = useState<number | null>(null);
  const [isBraking, setIsBraking] = useState(false);

  // Refs for Three.js and Cannon.js objects
  const worldRef = useRef<CANNON.World | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const playerBodyRef = useRef<CANNON.Body | null>(null);
  const playerMeshRef = useRef<THREE.Mesh | null>(null);
  const ballBodyRef = useRef<CANNON.Body | null>(null);
  const ballMeshRef = useRef<THREE.Mesh | null>(null);
  const goalPostsRef = useRef<Map<number, THREE.Mesh[]>>(new Map());
  const particlesRef = useRef<THREE.Points | null>(null);
  const particleDataRef = useRef<{ velocity: THREE.Vector3; life: number }[]>([]);
  const trailRef = useRef<THREE.Points | null>(null);
  const trailDataRef = useRef<{ life: number }[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const activeEffectsRef = useRef<{ [key in PowerUpType]?: number }>({});
  const joystickDirRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const botsRef = useRef<{ mesh: THREE.Mesh; body: CANNON.Body }[]>([]);
  const goalPositionsRef = useRef<CANNON.Vec3[]>([]);
  const keysRef = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (!containerRef.current) return;

    // --- Physics Setup ---
    const world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0),
    });
    worldRef.current = world;

    // --- Audio Setup ---
    const initAudio = () => {
      if (audioCtxRef.current) return;
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    };
    initAudio();

    // --- Materials ---
    const groundMaterial = new CANNON.Material('ground');
    const ballMaterial = new CANNON.Material('ball');
    const playerMaterial = new CANNON.Material('player');

    const ballGroundContact = new CANNON.ContactMaterial(groundMaterial, ballMaterial, {
      friction: 0.2, // Reduced friction for more sliding
      restitution: 0.8, // Increased bounciness
    });
    const playerBallContact = new CANNON.ContactMaterial(playerMaterial, ballMaterial, {
      friction: 0.1, // Reduced friction
      restitution: 0.95, // Highly bouncy
    });
    world.addContactMaterial(ballGroundContact);
    world.addContactMaterial(playerBallContact);

    // --- Three.js Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#050505');
    sceneRef.current = scene;

    // --- Bot Setup ---
    for (let i = 0; i < GOAL_COUNT; i++) {
      const angle = (i * Math.PI * 2) / GOAL_COUNT;
      goalPositionsRef.current.push(new CANNON.Vec3(Math.cos(angle) * (ARENA_RADIUS - 5), 1, Math.sin(angle) * (ARENA_RADIUS - 5)));
    }

    for (let i = 0; i < GOAL_COUNT - 1; i++) {
      const botGeo = new THREE.SphereGeometry(PLAYER_RADIUS, 16, 16);
      const botMat = new THREE.MeshStandardMaterial({ color: 0xff0000 + i * 0x111111 });
      const botMesh = new THREE.Mesh(botGeo, botMat);
      scene.add(botMesh);

      const botBody = new CANNON.Body({
        mass: 3,
        shape: new CANNON.Sphere(PLAYER_RADIUS),
        material: playerMaterial,
        fixedRotation: true,
        linearDamping: 0.9,
      });
      botBody.position.copy(goalPositionsRef.current[i + 1]);
      world.addBody(botBody);
      botsRef.current.push({ mesh: botMesh, body: botBody });
    }

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 30, 30);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(20, 40, 20);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.left = -30;
    mainLight.shadow.camera.right = 30;
    mainLight.shadow.camera.top = 30;
    mainLight.shadow.camera.bottom = -30;
    scene.add(mainLight);

    // --- Arena Floor ---
    const floorGeo = new THREE.CircleGeometry(ARENA_RADIUS + 2, 64);
    const floorMat = new THREE.MeshStandardMaterial({ 
      color: '#111', 
      roughness: 0.8,
      metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const groundBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
      material: groundMaterial,
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(groundBody);

    // --- Arena Boundaries ---
    const boundaryHeight = 3;
    const segmentAngle = (Math.PI * 2) / BOUNDARY_SEGMENTS;
    const segmentWidth = (Math.PI * 2 * ARENA_RADIUS) / BOUNDARY_SEGMENTS;

    for (let i = 0; i < BOUNDARY_SEGMENTS; i++) {
      const angle = i * segmentAngle;
      
      // Check if this segment is part of a goal
      let isGoal = false;
      let goalIndex = -1;
      for (let g = 0; g < GOAL_COUNT; g++) {
        const goalAngle = (g * Math.PI * 2) / GOAL_COUNT;
        const diff = Math.abs(angle - goalAngle);
        const normalizedDiff = Math.min(diff, Math.PI * 2 - diff);
        if (normalizedDiff < (GOAL_WIDTH / 2) / ARENA_RADIUS) {
          isGoal = true;
          goalIndex = g;
          break;
        }
      }

      if (!isGoal) {
        const x = Math.cos(angle) * ARENA_RADIUS;
        const z = Math.sin(angle) * ARENA_RADIUS;

        const wallGeo = new THREE.BoxGeometry(segmentWidth * 1.1, boundaryHeight, 0.5);
        const wallMat = new THREE.MeshStandardMaterial({ color: '#333' });
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(x, boundaryHeight / 2, z);
        wall.lookAt(0, boundaryHeight / 2, 0);
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);

        const wallBody = new CANNON.Body({
          type: CANNON.Body.STATIC,
          shape: new CANNON.Box(new CANNON.Vec3(segmentWidth / 2, boundaryHeight / 2, 0.25)),
        });
        wallBody.position.set(x, boundaryHeight / 2, z);
        wallBody.quaternion.copy(wall.quaternion as any);
        world.addBody(wallBody);
      } else {
        // Goal Visuals (Posts)
        const x = Math.cos(angle) * ARENA_RADIUS;
        const z = Math.sin(angle) * ARENA_RADIUS;
        
        // Only draw posts at the edges of the goal
        const nextAngle = (i + 1) * segmentAngle;
        let nextIsGoal = false;
        for (let g = 0; g < GOAL_COUNT; g++) {
          const goalAngle = (g * Math.PI * 2) / GOAL_COUNT;
          const diff = Math.abs(nextAngle - goalAngle);
          const normalizedDiff = Math.min(diff, Math.PI * 2 - diff);
          if (normalizedDiff < (GOAL_WIDTH / 2) / ARENA_RADIUS) {
            nextIsGoal = true;
            break;
          }
        }

        if (!nextIsGoal) {
           // Post
           const postGeo = new THREE.CylinderGeometry(0.3, 0.3, boundaryHeight + 1);
           const postMat = new THREE.MeshStandardMaterial({ color: '#ffcc00' });
           const post = new THREE.Mesh(postGeo, postMat);
           post.position.set(x, (boundaryHeight + 1) / 2, z);
           post.castShadow = true;
           scene.add(post);

           // Store post reference for the current goal
           if (!goalPostsRef.current.has(goalIndex)) {
             goalPostsRef.current.set(goalIndex, []);
           }
           goalPostsRef.current.get(goalIndex)?.push(post);

           const postBody = new CANNON.Body({
             type: CANNON.Body.STATIC,
             shape: new CANNON.Cylinder(0.3, 0.3, boundaryHeight + 1, 8),
           });
           postBody.position.set(x, (boundaryHeight + 1) / 2, z);
           world.addBody(postBody);
        }
      }
    }

    // --- Ball ---
    const ballGeo = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({ 
      color: '#ff4444', 
      roughness: 0.2, 
      metalness: 0.8,
      emissive: '#220000'
    });
    const ballMesh = new THREE.Mesh(ballGeo, ballMat);
    ballMesh.castShadow = true;
    scene.add(ballMesh);
    ballMeshRef.current = ballMesh;

    const ballBody = new CANNON.Body({
      mass: 0.8, // Slightly lighter for more explosive movement
      shape: new CANNON.Sphere(BALL_RADIUS),
      material: ballMaterial,
      linearDamping: 0.05, // Reduced damping for more speed
      angularDamping: 0.05, // Reduced damping for more spin
    });
    ballBody.position.set(0, 5, 0);
    ballBody.addEventListener('collide', (e: any) => {
      const impact = e.contact.getImpactVelocityAlongNormal();
      if (impact > 10) {
        ballBody.velocity.scale(1.5, ballBody.velocity);
        playSound('bump', 1);
      } else if (impact > 2) {
        playSound('bump', Math.min(impact / 10, 1));
      }
    });
    world.addBody(ballBody);
    ballBodyRef.current = ballBody;

    // --- Player ---
    const playerGeo = new THREE.CapsuleGeometry(PLAYER_RADIUS, 1, 4, 16);
    const playerMat = new THREE.MeshStandardMaterial({ color: '#4488ff', roughness: 0.5 });
    const playerMesh = new THREE.Mesh(playerGeo, playerMat);
    playerMesh.castShadow = true;
    scene.add(playerMesh);
    playerMeshRef.current = playerMesh;

    const playerBody = new CANNON.Body({
      mass: 5,
      shape: new CANNON.Sphere(PLAYER_RADIUS), // Using sphere for easier movement
      material: playerMaterial,
      fixedRotation: true,
      linearDamping: 0.9, // High damping for responsive movement
    });
    playerBody.position.set(5, 1, 5);
    world.addBody(playerBody);
    playerBodyRef.current = playerBody;

    // --- Particle System ---
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = 0;
      particlePositions[i * 3 + 1] = -100; // Hide initially
      particlePositions[i * 3 + 2] = 0;
      
      particleColors[i * 3] = 1;
      particleColors[i * 3 + 1] = 0.5;
      particleColors[i * 3 + 2] = 0;
    }
    
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    
    const particleMat = new THREE.PointsMaterial({
      size: 0.4,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });
    
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);
    particlesRef.current = particles;
    
    for (let i = 0; i < particleCount; i++) {
      particleDataRef.current.push({
        velocity: new THREE.Vector3(),
        life: 0
      });
    }

    // --- Ball Trail System ---
    const trailCount = 100;
    const trailGeo = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(trailCount * 3);
    const trailColors = new Float32Array(trailCount * 3);
    
    for (let i = 0; i < trailCount; i++) {
      trailPositions[i * 3 + 1] = -100;
      trailColors[i * 3] = 1;
      trailColors[i * 3 + 1] = 0.2;
      trailColors[i * 3 + 2] = 0.2;
    }
    
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    trailGeo.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
    
    const trailMat = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    
    const trail = new THREE.Points(trailGeo, trailMat);
    scene.add(trail);
    trailRef.current = trail;
    
    for (let i = 0; i < trailCount; i++) {
      trailDataRef.current.push({ life: 0 });
    }

    let nextTrailIdx = 0;
    const emitTrail = (x: number, y: number, z: number) => {
      const positions = trailRef.current!.geometry.attributes.position.array as Float32Array;
      positions[nextTrailIdx * 3] = x + (Math.random() - 0.5) * 0.5;
      positions[nextTrailIdx * 3 + 1] = y + (Math.random() - 0.5) * 0.5;
      positions[nextTrailIdx * 3 + 2] = z + (Math.random() - 0.5) * 0.5;
      trailDataRef.current[nextTrailIdx].life = 1.0;
      nextTrailIdx = (nextTrailIdx + 1) % trailCount;
      trailRef.current!.geometry.attributes.position.needsUpdate = true;
    };

    const triggerExplosion = (x: number, y: number, z: number) => {
      playSound('explosion');
      const positions = particlesRef.current!.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        
        particleDataRef.current[i].velocity.set(
          (Math.random() - 0.5) * 20,
          Math.random() * 15,
          (Math.random() - 0.5) * 20
        );
        particleDataRef.current[i].life = 1.0;
      }
      particlesRef.current!.geometry.attributes.position.needsUpdate = true;
    };

    const spawnPowerUp = () => {
      if (!sceneRef.current || !worldRef.current) return;
      
      const types: PowerUpType[] = ['BIG_BALL', 'SPEED_BOOST', 'DOUBLE_KICK'];
      const type = types[Math.floor(Math.random() * types.length)];
      
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (ARENA_RADIUS - 5);
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      const colors = {
        BIG_BALL: '#ff00ff',
        SPEED_BOOST: '#00ffff',
        DOUBLE_KICK: '#ffff00'
      };

      const geo = new THREE.OctahedronGeometry(0.8);
      const mat = new THREE.MeshStandardMaterial({ 
        color: colors[type], 
        emissive: colors[type],
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.8
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, 1, z);
      sceneRef.current.add(mesh);

      const body = new CANNON.Body({
        isTrigger: true,
        shape: new CANNON.Sphere(1),
      });
      body.position.set(x, 1, z);
      worldRef.current.addBody(body);

      const powerUp: PowerUp = { id: Math.random().toString(), type, mesh, body };
      powerUpsRef.current.push(powerUp);
    };

    const applyPowerUp = (type: PowerUpType) => {
      activeEffectsRef.current[type] = Date.now() + POWERUP_DURATION;
      setActivePowerUps(prev => ({ ...prev, [type]: true }));

      if (type === 'BIG_BALL' && ballBodyRef.current && ballMeshRef.current) {
        ballMeshRef.current.scale.set(2, 2, 2);
        ballBodyRef.current.shapes[0] = new CANNON.Sphere(BALL_RADIUS * 2);
        ballBodyRef.current.updateBoundingRadius();
      }
      if (type === 'DOUBLE_KICK' && playerBodyRef.current) {
        playerBodyRef.current.mass = 20; // Heavier player = more momentum
        playerBodyRef.current.updateMassProperties();
      }
    };

    const removePowerUp = (type: PowerUpType) => {
      delete activeEffectsRef.current[type];
      setActivePowerUps(prev => {
        const next = { ...prev };
        delete next[type];
        return next;
      });

      if (type === 'BIG_BALL' && ballBodyRef.current && ballMeshRef.current) {
        ballMeshRef.current.scale.set(1, 1, 1);
        ballBodyRef.current.shapes[0] = new CANNON.Sphere(BALL_RADIUS);
        ballBodyRef.current.updateBoundingRadius();
      }
      if (type === 'DOUBLE_KICK' && playerBodyRef.current) {
        playerBodyRef.current.mass = 5;
        playerBodyRef.current.updateMassProperties();
      }
    };

    const createWallAtGoal = (goalIndex: number) => {
      const goalAngle = (goalIndex * Math.PI * 2) / GOAL_COUNT;
      const wallWidth = GOAL_WIDTH + 1;
      const boundaryHeight = 3;
      
      const x = Math.cos(goalAngle) * ARENA_RADIUS;
      const z = Math.sin(goalAngle) * ARENA_RADIUS;

      // Stone Wall Material
      const wallGeo = new THREE.BoxGeometry(wallWidth, boundaryHeight, 1.2);
      const wallMat = new THREE.MeshStandardMaterial({ 
        color: '#2c2c2c',
        roughness: 0.9,
        metalness: 0.1,
        flatShading: true
      });
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.position.set(x, boundaryHeight / 2, z);
      wall.lookAt(0, boundaryHeight / 2, 0);
      wall.castShadow = true;
      wall.receiveShadow = true;
      sceneRef.current?.add(wall);

      // Change existing posts to "Metal" look
      const posts = goalPostsRef.current.get(goalIndex);
      if (posts) {
        posts.forEach(post => {
          post.material = new THREE.MeshStandardMaterial({
            color: '#1a1a1a',
            roughness: 0.1,
            metalness: 1.0,
            emissive: '#111111'
          });
        });
      }

      const wallBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Box(new CANNON.Vec3(wallWidth / 2, boundaryHeight / 2, 0.4)),
      });
      wallBody.position.set(x, boundaryHeight / 2, z);
      wallBody.quaternion.copy(wall.quaternion as any);
      worldRef.current?.addBody(wallBody);
    };

    // --- Input Handling ---
    const handleKeyDown = (e: KeyboardEvent) => { keysRef.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // --- Resize Handling ---
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // --- Game Loop ---
    let lastTime = performance.now();
    let powerUpTimer = 0;

    const animate = () => {
      requestAnimationFrame(animate);
      
      const time = performance.now();
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      if (worldRef.current && playerBodyRef.current && ballBodyRef.current) {
        worldRef.current.step(1 / 60, dt, 3);

        // Power-up Spawning
        if (gameStarted) {
          powerUpTimer += dt;
          if (powerUpTimer > 5) {
            spawnPowerUp();
            powerUpTimer = 0;
          }
        }

        // Power-up Collection & Expiration
        const now = Date.now();
        (Object.keys(activeEffectsRef.current) as PowerUpType[]).forEach(type => {
          if (now > (activeEffectsRef.current[type] || 0)) {
            removePowerUp(type);
          }
        });

        // Bot AI
        botsRef.current.forEach((bot, i) => {
          if (eliminated[i + 1]) return;
          const distToBall = bot.body.position.distanceTo(ballBody.position);
          const target = distToBall < 12 ? ballBody.position : goalPositionsRef.current[i + 1];
          const dir = target.vsub(bot.body.position).unit();
          bot.body.applyForce(dir.scale(30), bot.body.position);
          
          bot.mesh.position.copy(bot.body.position as any);
        });

        for (let i = powerUpsRef.current.length - 1; i >= 0; i--) {
          const pu = powerUpsRef.current[i];
          pu.mesh.rotation.y += dt * 2;
          pu.mesh.position.y = 1 + Math.sin(time * 0.005) * 0.2;

          const dist = playerBodyRef.current.position.distanceTo(pu.body.position);
          if (dist < 2) {
            playSound('powerup');
            applyPowerUp(pu.type);
            sceneRef.current?.remove(pu.mesh);
            worldRef.current?.removeBody(pu.body);
            powerUpsRef.current.splice(i, 1);
          }
        }

        // Player Movement
        let force = 50;
        if (activeEffectsRef.current['SPEED_BOOST']) force = 100;
        
        if (isBraking && playerBodyRef.current) {
          playerBodyRef.current.velocity.set(0, 0, 0);
          playerBodyRef.current.angularVelocity.set(0, 0, 0);
        }

        const moveDir = new CANNON.Vec3(0, 0, 0);
        if (gameStarted) {
          // Keyboard Input
          if (keysRef.current['KeyW']) moveDir.z -= 1;
          if (keysRef.current['KeyS']) moveDir.z += 1;
          if (keysRef.current['KeyA']) moveDir.x -= 1;
          if (keysRef.current['KeyD']) moveDir.x += 1;

          // Joystick Input (Additive)
          moveDir.x += joystickDirRef.current.x;
          moveDir.z += joystickDirRef.current.y;
        }

        if (moveDir.length() > 0) {
          moveDir.normalize();
          playerBodyRef.current.applyForce(moveDir.scale(force), playerBodyRef.current.position);
        }

        // Sync Meshes
        playerMeshRef.current?.position.copy(playerBodyRef.current.position as any);
        playerMeshRef.current?.quaternion.copy(playerBodyRef.current.quaternion as any);
        
        ballMeshRef.current?.position.copy(ballBodyRef.current.position as any);
        ballMeshRef.current?.quaternion.copy(ballBodyRef.current.quaternion as any);

        // Trail Emission
        const ballVel = ballBodyRef.current.velocity;
        const speed = Math.sqrt(ballVel.x * ballVel.x + ballVel.z * ballVel.z);
        if (speed > 5) {
          emitTrail(ballBodyRef.current.position.x, ballBodyRef.current.position.y, ballBodyRef.current.position.z);
        }

        // Camera Follow
        const targetCamPos = new THREE.Vector3(
          playerBodyRef.current.position.x,
          playerBodyRef.current.position.y + 15,
          playerBodyRef.current.position.z + 20
        );
        cameraRef.current?.position.lerp(targetCamPos, 0.1);
        cameraRef.current?.lookAt(playerMeshRef.current?.position || new THREE.Vector3());

        // Goal Detection
        const ballPos = ballBodyRef.current.position;
        const distFromCenter = Math.sqrt(ballPos.x * ballPos.x + ballPos.z * ballPos.z);
        
        if (distFromCenter > ARENA_RADIUS + 1) {
          const angle = Math.atan2(ballPos.z, ballPos.x);
          const normalizedAngle = angle < 0 ? angle + Math.PI * 2 : angle;
          const goalIndex = Math.round((normalizedAngle / (Math.PI * 2)) * GOAL_COUNT) % GOAL_COUNT;
          
          if (!eliminated[goalIndex]) {
            setEliminated(prev => {
              const next = [...prev];
              next[goalIndex] = true;
              return next;
            });
            setLastGoal(goalIndex);
            triggerExplosion(ballPos.x, ballPos.y, ballPos.z);
            createWallAtGoal(goalIndex);
            
            if (goalIndex > 0) {
              const bot = botsRef.current[goalIndex - 1];
              sceneRef.current?.remove(bot.mesh);
              worldRef.current?.removeBody(bot.body);
            }
            playSound('goal');
          }

          // Reset Ball
          ballBodyRef.current.position.set(0, 5, 0);
          ballBodyRef.current.velocity.set(0, 0, 0);
          ballBodyRef.current.angularVelocity.set(0, 0, 0);
        }

        // Update Particles
        if (particlesRef.current) {
          const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
          let needsUpdate = false;
          for (let i = 0; i < particleCount; i++) {
            const data = particleDataRef.current[i];
            if (data.life > 0) {
              positions[i * 3] += data.velocity.x * dt;
              positions[i * 3 + 1] += data.velocity.y * dt;
              positions[i * 3 + 2] += data.velocity.z * dt;
              data.velocity.y -= 20 * dt; // Gravity
              data.life -= dt * 0.8;
              needsUpdate = true;
              
              if (data.life <= 0) {
                positions[i * 3 + 1] = -100;
              }
            }
          }
          if (needsUpdate) {
            particlesRef.current.geometry.attributes.position.needsUpdate = true;
          }
        }

        // Update Trail
        if (trailRef.current) {
          const positions = trailRef.current.geometry.attributes.position.array as Float32Array;
          let needsUpdate = false;
          for (let i = 0; i < trailCount; i++) {
            const data = trailDataRef.current[i];
            if (data.life > 0) {
              data.life -= dt * 2.0;
              if (data.life <= 0) {
                positions[i * 3 + 1] = -100;
                needsUpdate = true;
              }
            }
          }
          if (needsUpdate) {
            trailRef.current.geometry.attributes.position.needsUpdate = true;
          }
        }
      }

      rendererRef.current?.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  const resetGame = () => {
    setScore(new Array(GOAL_COUNT).fill(0));
    setEliminated(new Array(GOAL_COUNT).fill(false));
    setLastGoal(null);
    // Note: In a real app, we'd need to remove the added wall meshes/bodies.
    // For this prototype, we'll just reload or clear the scene if we wanted a full reset.
    window.location.reload(); 
  };

  return (
    <div ref={containerRef} className="relative w-full h-screen overflow-hidden bg-black touch-none">
      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full p-4 md:p-6 pointer-events-none flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-4xl font-black text-white tracking-tighter uppercase italic">
            Battle Arena <span className="text-red-500">3D</span>
          </h1>
          <div className="hidden sm:flex gap-2 md:gap-4">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 px-3 md:px-4 py-1.5 md:py-2 rounded-full flex items-center gap-2">
              <Move className="w-3 h-3 md:w-4 md:h-4 text-blue-400" />
              <span className="text-[10px] md:text-xs font-bold text-white uppercase tracking-widest">WASD to Move</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 px-3 md:px-4 py-1.5 md:py-2 rounded-full flex items-center gap-2">
              <MousePointer2 className="w-3 h-3 md:w-4 md:h-4 text-red-400" />
              <span className="text-[10px] md:text-xs font-bold text-white uppercase tracking-widest">Bump the Ball</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1 md:gap-2 w-full md:w-auto max-w-sm md:max-w-none">
          {eliminated.map((isOut, i) => (
            <div 
              key={i} 
              className={`px-2 md:px-3 py-1 rounded border transition-all duration-500 ${
                isOut ? 'bg-red-900/80 border-red-500 opacity-50' : 
                lastGoal === i ? 'bg-red-500 border-red-400 scale-105 md:scale-110' : 'bg-black/50 border-white/10'
              }`}
            >
              <div className="text-[8px] md:text-[10px] text-white/50 font-bold uppercase leading-tight">P{i + 1}</div>
              <div className="text-xs md:text-xl font-black text-white leading-tight">{isOut ? 'OUT' : 'OK'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Power-ups */}
      <div className="absolute top-48 md:top-32 left-4 md:left-6 space-y-2 pointer-events-none">
        <AnimatePresence>
          {activePowerUps.BIG_BALL && (
            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="bg-fuchsia-600 px-4 py-1 rounded-r-full border-l-4 border-white text-[10px] font-black text-white uppercase tracking-widest">Big Ball Active</motion.div>
          )}
          {activePowerUps.SPEED_BOOST && (
            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="bg-cyan-600 px-4 py-1 rounded-r-full border-l-4 border-white text-[10px] font-black text-white uppercase tracking-widest">Speed Boost Active</motion.div>
          )}
          {activePowerUps.DOUBLE_KICK && (
            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="bg-yellow-600 px-4 py-1 rounded-r-full border-l-4 border-white text-[10px] font-black text-white uppercase tracking-widest">Double Kick Active</motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Virtual Joystick for Mobile */}
      {gameStarted && (
        <>
          <div className="absolute bottom-12 left-12 pointer-events-auto md:hidden">
            <div className="relative w-32 h-32 bg-white/5 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center">
              <motion.div
                drag
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                dragElastic={0}
                onDrag={(_, info) => {
                  const maxDist = 50;
                  // Use delta or offset to calculate direction
                  const x = Math.max(-maxDist, Math.min(maxDist, info.offset.x)) / maxDist;
                  const y = Math.max(-maxDist, Math.min(maxDist, info.offset.y)) / maxDist;
                  joystickDirRef.current = { x, y };
                }}
                onDragEnd={() => {
                  joystickDirRef.current = { x: 0, y: 0 };
                }}
                className="w-12 h-12 bg-white/20 backdrop-blur-lg rounded-full border border-white/30 shadow-xl cursor-grab active:cursor-grabbing"
              />
            </div>
          </div>

          {/* Brake Button for Mobile */}
          <div className="absolute bottom-12 right-32 pointer-events-auto md:hidden">
            <button
              onTouchStart={() => setIsBraking(true)}
              onTouchEnd={() => setIsBraking(false)}
              onMouseDown={() => setIsBraking(true)}
              onMouseUp={() => setIsBraking(false)}
              className={`w-20 h-20 rounded-full border-2 flex items-center justify-center transition-all ${
                isBraking ? 'bg-red-600 border-red-400 scale-90' : 'bg-white/5 border-white/20'
              }`}
            >
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Brake</span>
            </button>
          </div>
        </>
      )}

      {/* Center Message */}
      <AnimatePresence>
        {!gameStarted && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-black/60 backdrop-blur-sm"
          >
            <div className="text-center space-y-8">
              <div className="space-y-2">
                <Trophy className="w-20 h-20 text-yellow-500 mx-auto animate-bounce" />
                <h2 className="text-6xl font-black text-white uppercase italic tracking-tighter">Ready to Rumble?</h2>
                <p className="text-white/60 max-w-md mx-auto">
                  8 goals, 1 ball, and a lot of friction. Push the ball out of the arena through any goal to score.
                </p>
              </div>
              <button 
                onClick={() => {
                  setGameStarted(true);
                  if (audioCtxRef.current?.state === 'suspended') {
                    audioCtxRef.current.resume();
                  }
                }}
                className="px-12 py-4 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-2xl shadow-red-900/40"
              >
                Start Battle
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset Button */}
      {gameStarted && (
        <button 
          onClick={resetGame}
          className="absolute bottom-8 right-8 p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full text-white transition-all pointer-events-auto group"
        >
          <RotateCcw className="w-6 h-6 group-hover:rotate-180 transition-transform duration-500" />
        </button>
      )}

      {/* Goal Notification */}
      <AnimatePresence>
        {lastGoal !== null && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            onAnimationComplete={() => setTimeout(() => setLastGoal(null), 2000)}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-red-600 px-8 py-3 rounded-full shadow-2xl"
          >
            <span className="text-white font-black uppercase tracking-widest italic">Player #{lastGoal + 1} ELIMINATED!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
