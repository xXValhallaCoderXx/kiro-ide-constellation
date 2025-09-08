---
inclusion: fileMatch
fileMatchPattern: "web/**/*"
---

# Web UI Engineering (Preact + Vite + VS Code Webview)

Act as a senior frontend engineer specialized in Preact + TypeScript for VS Code webviews. Follow Atomic Design, use CSS Modules for styling, and work within the constraints of a VS Code webview and our Vite build.

This steering applies only to files under `web/`.

## Tech + environment

- Framework: Preact 10 + TypeScript
- Build: Vite with `@preact/preset-vite`, multi-entry build targeting VS Code webviews
- JSX runtime: automatic (`jsx: "react-jsx"`, `jsxImportSource: "preact"`)
- Webview constraints: No Node APIs; communicate with the extension via `postMessage` using our message bus.

References:

- #[[file:web/vite.config.ts]]
- #[[file:web/tsconfig.json]]
- #[[file:web/src/vscode.ts]]
- #[[file:web/src/services/message-bus.service.ts]]

## Project structure and roles

- `web/src/views/*`: View shells (one per webview). Keep them thin and composed of components.
  - Examples: #[[file:web/src/views/Sidebar/Sidebar.tsx]], #[[file:web/src/views/HealthDashboard/HealthDashboard.tsx]]
- `web/src/components/`: Reusable components organized by Atomic Design
  - `atoms/`: primitive UI, no domain logic
  - `molecules/`: small compositions (example: #[[file:web/src/components/molecules/Button.tsx]])
  - `organisms/`: larger compositions
- `web/src/services/`: Browser-only helpers; e.g., message bus for the VS Code bridge
- Entrypoints: `web/src/main-sidebar.tsx`, `web/src/main-dashboard.tsx` mount views via `preact/render`

## Component conventions (Atomic Design)

- One component per file. Name files and components with PascalCase.
- Prefer named exports (`export function Foo() {}`), not default exports.
- Atoms: stateless and style-focused; no direct message bus calls.
- Molecules/Organisms: may use hooks and message bus; keep effects localized and cleaned up.
- Views: assemble components and wire events; avoid duplicating reusable UI.

## TypeScript + Preact patterns

- Import hooks from `preact/hooks`.
- Use the automatic JSX runtime; only import `h` for types: `import type { h, ComponentChildren } from 'preact'` when needed.
- Props typing: define an explicit `Props` interface; avoid `any`.
- Children type: prefer `ComponentChildren`.
- Event types: use `h.JSX.TargetedEvent` and specific element types when useful.

Example (molecule):

```tsx
import { useEffect, useState } from "preact/hooks";
import type { ComponentChildren, h } from "preact";
import styles from "./Example.module.css";

interface Props extends h.JSX.HTMLAttributes<HTMLDivElement> {
  children?: ComponentChildren;
}

export function Example({ children, className, ...rest }: Props) {
  return (
    <div
      className={[styles.root, className].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}
```

## CSS Modules guidelines

- Co-locate a single `ComponentName.module.css` per component.
- Import as `import styles from './ComponentName.module.css'` and bind via `className={styles.someClass}`.
- Avoid dynamic class keys (e.g., `styles['x-' + variant]`). Prefer a small map or conditional join.
- Keep selectors flat and local; avoid global tags and deep nesting.
- Variables and theme: prefer CSS variables at the component or :root level; do not rely on global CSS unless explicitly referenced.

Example:

```css
/* ComponentName.module.css */
.root {
  display: grid;
  gap: 8px;
}
.primary {
  background: var(--vscode-button-background);
  color: var(--vscode-foreground);
}
```

```tsx
const cls = [styles.root, isPrimary && styles.primary]
  .filter(Boolean)
  .join(" ");
```

## Messaging and VS Code bridge

Use the shared message bus inside webviews; do not call `acquireVsCodeApi` directly in components.

- Subscribe inside `useEffect` and always unsubscribe on cleanup.
- Keep event payloads typed using `EventPayloads` from shared events.
- Emit via `messageBus.emit(events.SomeEvent, payload)`.

References:

- #[[file:web/src/services/message-bus.service.ts]]
- #[[file:src/shared/events.ts]]

Example subscription pattern:

```tsx
import { useEffect } from "preact/hooks";
import { messageBus, events } from "../../services/message-bus.service";

useEffect(() => {
  const off = messageBus.on(events.DashboardOpened, (e) => {
    // handle event safely
  });
  return () => off();
}, []);
```

## Views: mounting and entries

- Mount views using `render(<View />, root)` in `main-*.tsx` entry files.
- Ensure a static `#root` container exists in the HTML provided by the extension.
- Keep view state minimal; push reusable UI down into components.

References:

- #[[file:web/src/main-sidebar.tsx]]
- #[[file:web/src/main-dashboard.tsx]]

## Accessibility and UX

- Buttons and interactive elements must be reachable via keyboard; ensure `role`, `aria-*` as needed.
- Provide visible focus states in CSS Modules.
- Use semantic elements (`button`, `nav`, `section`, `h*`) over divs.

## Import + path rules

- Use relative imports within `web/`. No custom TS path aliases are defined.
- Do not import Node-only modules or extension-side code into web.
- You may import shared types/constants from `src/shared/*` when they are pure and compatible with browser bundles.

## Performance tips

- Keep components pure; avoid re-renders by lifting state appropriately.
- Prefer simple conditionals and class joins over heavy utility libraries.
- Avoid large dependencies; Preact already provides the essentials.

## Testing and examples

- Follow the Button molecule as a baseline for simple components: #[[file:web/src/components/molecules/Button.tsx]]
- When adding new molecules/organisms, create a matching `.module.css` and colocate it with the component.

## Do / Don't

- Do: named exports, typed props, CSS Modules, cleanup of effects, atomic structure.
- Do: use `messageBus` to communicate with the extension.
- Don't: default exports, global CSS for component styling, untyped payloads, direct `acquireVsCodeApi()` in component code.
