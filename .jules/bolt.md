## 2025-03-08 - Optimized Object Allocation in High-Frequency Game Loops

**Learning:** Allocating objects like `new THREE.Vector3()` or `new CANNON.Vec3()` inside high-frequency `useFrame` game loops forces continuous garbage collection which leads to dropped frames and game stutter.

**Action:** Hoisted vector allocations to reusable module-scoped variables (`_botPos`, `_ballPos`, etc.) for in-place component updates via `.set()` and `.copy()`. Also replaced square-root intensive geometric comparisons (`.distanceTo()`, `length()`) with their squared equivalents (`.distanceToSquared()`, `.lengthSq()`).
