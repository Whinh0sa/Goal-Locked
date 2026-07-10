## 2024-07-10 - Semantic HTML for Interactive Elements
**Learning:** Found a pattern where interactive HUD elements and menu buttons were built using `<div>` tags with `onClick` handlers, missing keyboard accessibility and screen reader support.
**Action:** Always use `<button>` for clickable elements to get native keyboard support, and add descriptive `aria-label`s to icon-only buttons or HUD controls.
