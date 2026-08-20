## 2025-03-09 - React Three Fiber (useFrame) memory allocation
**Learning:** Avoid instantiating new objects (like `new THREE.Vector3()`) inside the `useFrame` loop. This leads to continuous memory allocation each frame, which degrades performance and triggers garbage collection pauses.
**Action:** Always hoist object instantiations out of `useFrame` (either to module-level constants or via `useRef`) and mutate them in-place using methods like `.set()` or `.copy()`.
