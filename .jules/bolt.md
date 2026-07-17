## 2024-05-30 - Optimize Store Subscription
**Learning:** Destructuring directly from `useGameStore()` in Zustand components without selectors causes unnecessary re-renders on state changes (e.g. ball/player position updates). `useShallow` from `zustand/react/shallow` should be used instead.
**Action:** Use `useShallow` to wrap the selector that returns multiple items to avoid whole-app re-renders.
