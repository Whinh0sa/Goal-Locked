## 2024-05-18 - Math.sqrt in Game Loop Optimization
**Learning:** Avoid using computationally expensive operations like `Math.sqrt()` (via `.distanceTo()`) for distance checks inside high-frequency game loops (e.g., `useFrame`). Use squared distance comparisons instead (e.g., `.distanceToSquared() < radius * radius`) to prevent CPU load and framedrops.
**Action:** Replaced `.distanceTo()` with `.distanceToSquared()` in `GameManager.tsx`'s slow-mo logic.
