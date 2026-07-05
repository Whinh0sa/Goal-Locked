## 2025-05-15 - Unvalidated URL Parameter Injection
**Vulnerability:** The application was reading a `color` parameter directly from `window.location.search` and applying it to application state (`playerRingColor`) without any validation or sanitization.
**Learning:** Even seemingly harmless parameters like "color" can be used as injection vectors if passed directly to libraries (e.g., three.js) or DOM elements, potentially leading to errors or XSS if not handled securely by downstream components.
**Prevention:** Always validate and sanitize user input, including URL query parameters, against strict allowlists or regex patterns (e.g., `/^[0-9A-Fa-f]{6}$/` for hex colors) before using them in the application.
