## 2024-05-15 - [Initial Entry]

## 2024-05-15 - [Interactive UI Elements using div]
**Learning:** Found an accessibility issue pattern specific to this app's components: interactive components (like Camera Mode and Graphics toggles) were built using generic `<div>` elements instead of semantic `<button>` elements. This breaks screen readers and keyboard navigation (tabbing, focus). Also, custom form controls like range sliders were missing explicit `<label>` element links (`htmlFor`/`id`).
**Action:** Use semantic HTML tags for interactive components. Always use `<button type='button'>` for clickable UI elements to preserve built-in accessibility. Add aria-labels for icon/text toggles and explicit labels for inputs. Add onFocus/onBlur event handlers alongside hover handlers for explicit focus visible states.
