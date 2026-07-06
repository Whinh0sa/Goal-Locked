## 2024-05-18 - [Learning Zustand Re-renders]
**Learning:** `useGameStore()` without a selector in React components will cause the component to re-render every time ANY value in the state changes. This is extremely bad for performance if not used with care, especially with rapidly changing values like position or timestamps.
**Action:** Always use selectors `useGameStore(s => s.property)` rather than destructuring from `const { property } = useGameStore()`.
