## 2024-07-24 - Zustand Shallow Rendering Optimization
**Learning:** Destructuring directly from `useGameStore()` without a selector in React components causes widespread, unnecessary re-renders when rapidly changing states update, which degrades application performance.
**Action:** Implemented `useShallow` from `zustand/react/shallow` to wrap the selector, ensuring that components only re-render when the selected properties change, maintaining optimal performance.
