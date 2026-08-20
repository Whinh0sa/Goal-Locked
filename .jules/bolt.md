## 2024-05-18 - Avoid Math.sqrt for Distance Checks in Game Loops

**Learning:** `Math.sqrt` is computationally expensive to use in high-frequency game loops (like `useFrame` which runs every frame, typically 60fps).
In `src/components/Entities/PowerUp.tsx`, calculating the Euclidean distance using `Math.sqrt(dx * dx + dz * dz)` against every single bot in the arena caused unnecessary CPU load and framedrops.
Our benchmark proved that a simple squared distance check `distSq < PICKUP_RADIUS * PICKUP_RADIUS` is ~65% faster.

**Action:** Replaced `Math.sqrt()` distance calculations with squared distance comparisons (`distSq < PICKUP_RADIUS_SQ`) for both player and bots power-up pickup checking logic to improve overall framerate performance.
