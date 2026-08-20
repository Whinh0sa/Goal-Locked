## 2024-05-24 - Avoid CANNON.Vec3 allocations in useFrame
**Learning:** `CANNON.Vec3` methods like `.vsub()`, `.unit()`, and `.scale()` allocate new objects by default. When called inside a high-frequency loop like `useFrame`, this causes significant garbage collection overhead.
**Action:** Pre-allocate `CANNON.Vec3` objects at the module scope or using `useRef` and pass them as targets to mutation methods (`.vsub(other, target)`, `.unit(target)`, `.scale(scalar, target)`) to eliminate allocations.
