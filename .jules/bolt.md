## 2024-11-20 - Avoid Math.sqrt and new CANNON.Vec3 in high-frequency useFrame loops
**Learning:** In React Three Fiber game loops (e.g., `useFrame`), calculating distance using `Math.sqrt()` or using cannon-es vector methods like `.length()` or `.unit()` (which allocate new `CANNON.Vec3` objects) causes severe CPU load and garbage collection stutter. The `GravityWell.tsx` component was allocating a new `Vec3` for `wellPos` every frame, allocating another `Vec3` from `.vsub`, calling `.length()` (which runs `Math.sqrt`), allocating another `Vec3` from `.unit()`, and allocating yet another `Vec3` from `.scale()`. All of these ran every frame for every dynamic body in the physics simulation.
**Action:** Always pre-allocate vectors outside of the component or `useFrame` loop (e.g., `const tmpDiff = new CANNON.Vec3()`). Mutate them in place using methods like `.set()` and `.vsub(other, tmpDiff)`. Use `.lengthSquared()` instead of `.length()` to avoid `Math.sqrt()`, and compare against squared distances (e.g., `radius * radius`). Manually calculate inverse distances and set vector values individually to bypass internal `.unit()` allocations.

## 2024-05-18 - Math.sqrt() anti-pattern in useFrame
**Learning:** Found multiple instances of `Math.sqrt()` inside high-frequency loops (like `useFrame`) for computing distances. This is a CPU-intensive operation that can lead to frame drops.
**Action:** Replace `Math.sqrt(x*x + y*y)` with squared distance comparisons (e.g., `x*x + y*y < radius * radius`) inside `useFrame` to avoid unnecessary square root calculations.

## 2024-05-18 - Avoid new Vec3 allocations (.vsub()) inside useFrame
**Learning:** In cannon-es, methods like `.vsub()`, `.unit()`, and `.scale()` allocate and return new `CANNON.Vec3` instances by default. When called inside `useFrame`, this generates excessive garbage collection pressure.
**Action:** Always pre-allocate target vectors and pass them as the final argument to these mutation methods (e.g., `vec.vsub(other, targetVec)`, `vec.unit(targetVec)`), or avoid them entirely by doing manual inline coordinate calculations.

## 2024-05-18 - Avoid new THREE.Vector3() allocations inside useFrame
**Learning:** Instantiating new `THREE.Vector3` objects inside high-frequency loops like `useFrame` causes excessive garbage collection, leading to frame drops.
**Action:** Pre-allocate vectors outside the loop or use `useRef` and mutate them in place (e.g., `vecRef.current.copy(source)` or `vecRef.current.set(x,y,z)`).

## 2025-03-09 - React Three Fiber (useFrame) memory allocation
**Learning:** Avoid instantiating new objects (like `new THREE.Vector3()`) inside the `useFrame` loop. This leads to continuous memory allocation each frame, which degrades performance and triggers garbage collection pauses.
**Action:** Always hoist object instantiations out of `useFrame` (either to module-level constants or via `useRef`) and mutate them in-place using methods like `.set()` or `.copy()`.

## 2024-05-18 - Avoid Math.sqrt for Distance Checks in Game Loops
**Learning:** `Math.sqrt` is computationally expensive to use in high-frequency game loops (like `useFrame` which runs every frame, typically 60fps). In `src/components/Entities/PowerUp.tsx`, calculating the Euclidean distance using `Math.sqrt(dx * dx + dz * dz)` against every single bot in the arena caused unnecessary CPU load and framedrops.
**Action:** Replaced `Math.sqrt()` distance calculations with squared distance comparisons (`distSq < PICKUP_RADIUS_SQ`) for both player and bots power-up pickup checking logic to improve overall framerate performance.
