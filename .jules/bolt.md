## 2024-05-19 - Garbage Collection in `useFrame`

**Learning:** Instantiating new objects (like `new THREE.Vector3()` or `new CANNON.Vec3()`) inside high-frequency loops like React Three Fiber's `useFrame` creates significant garbage collection overhead, leading to frame drops and jank.
**Action:** Always hoist object instantiations to module scope or use `useRef` and mutate them in place using methods like `.set()` or `.copy()` instead of creating new instances.
