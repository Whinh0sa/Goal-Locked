## 2024-05-18 - [DOM XSS Prevention in Portal Mechanics]
**Vulnerability:** DOM XSS via unvalidated window.location.href assignment.
**Learning:** `window.location.href = destinationUrl` is dangerous when `destinationUrl` can be controlled.
**Prevention:** Validate URL protocols (http/https) using `new URL()` before assignment.
