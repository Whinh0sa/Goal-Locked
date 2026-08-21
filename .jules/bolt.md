## 2024-05-18 - Math.sqrt() anti-pattern in useFrame
**Learning:** Found multiple instances of `Math.sqrt()` inside high-frequency loops (like `useFrame`) for computing distances. This is a CPU-intensive operation that can lead to frame drops.
**Action:** Replace `Math.sqrt(x*x + y*y)` with squared distance comparisons (e.g., `x*x + y*y < radius * radius`) inside `useFrame` to avoid unnecessary square root calculations.
## 2024-05-18 - Avoid new Vec3 allocations (.vsub()) inside useFrame
**Learning:** In cannon-es, methods like `.vsub()`, `.unit()`, and `.scale()` allocate and return new `CANNON.Vec3` instances by default. When called inside `useFrame`, this generates excessive garbage collection pressure.
**Action:** Always pre-allocate target vectors and pass them as the final argument to these mutation methods (e.g., `vec.vsub(other, targetVec)`, `vec.unit(targetVec)`), or avoid them entirely by doing manual inline coordinate calculations.
## 2024-05-18 - Avoid new THREE.Vector3() allocations inside useFrame
**Learning:** Instantiating new `THREE.Vector3` objects inside high-frequency loops like `useFrame` causes excessive garbage collection, leading to frame drops.
**Action:** Pre-allocate vectors outside the loop or use `useRef` and mutate them in place (e.g., `vecRef.current.copy(source)` or `vecRef.current.set(x,y,z)`).
