## 2024-05-24 - [Local Storage Prototype Pollution & Type Safety]
**Vulnerability:** Loading `localStorage` user input blindly using `...JSON.parse()` without type checking or schema validation allows maliciously crafted JSON to override expected types or execute prototype pollution attacks if prototype fields are accessible.
**Learning:** Always validate types when hydrating data from insecure storages (like `localStorage`).
**Prevention:** Construct objects explicitly with validated properties instead of merging user input blindly via the spread operator.
