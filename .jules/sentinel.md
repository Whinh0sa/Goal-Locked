## 2024-05-24 - [Local Storage Prototype Pollution & Type Safety]
**Vulnerability:** Loading `localStorage` user input blindly using `...JSON.parse()` without type checking or schema validation allows maliciously crafted JSON to override expected types or execute prototype pollution attacks if prototype fields are accessible.
**Learning:** Always validate types when hydrating data from insecure storages (like `localStorage`).
**Prevention:** Construct objects explicitly with validated properties instead of merging user input blindly via the spread operator.

## 2025-02-27 - [URL Query Parameter XSS Risk]
**Vulnerability:** URL query parameters (like `?color=`) were being read via `URLSearchParams` and passed directly to global state without any validation. While used safely in this context (as a CSS color in Three.js/React bindings), passing unvalidated user input directly into application state is a dangerous pattern that can lead to CSS Injection or XSS if the value is ever rendered directly in the DOM.
**Learning:** Even if the framework (React/Three.js) sanitizes the final output, accepting malformed data (like `?color=123%22%3E%3Cscript%3Ealert(1)%3C/script%3E`) pollutes the application state and violates the principle of "fail securely" and input validation.
**Prevention:** Always validate and sanitize external inputs (like URL parameters) at the boundary before they enter the application state. Use strict regex (e.g., `/^[0-9A-Fa-f]{3,8}$/`) for specific formats like hex colors.
