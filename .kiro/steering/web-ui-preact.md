---
inclusion: fileMatch
fileMatchPattern: "packages/webview/**/*"
---

# Web UI Engineering (Preact + Vite + VS Code Webview)

Act as a senior frontend engineer specialized in Preact + TypeScript for VS Code webviews. Use CSS Modules for styling, and work within the constraints of a VS Code webview and our Vite build.

This steering applies only to files under `packages/webview/`.

## Tech + environment
- Framework: Preact 10 + TypeScript
- Build: Vite with `@preact/preset-vite`, multi-entry build targeting VS Code webviews
- JSX runtime: automatic (`jsx: "react-jsx"`, `jsxImportSource: "preact"`)
- Webview constraints: No Node APIs; communicate with the extension via the message bus wrapper.

References:
- #[[file:packages/webview/vite.config.ts]]
- #[[file:packages/webview/tsconfig.json]]
- #[[file:packages/webview/src/vscode.ts]]
- #[[file:packages/webview/src/services/message-bus.service.ts]]

## Project structure and roles
- Entrypoints (configured in Vite): `src/main-sidebar.tsx`, `src/main-dashboard.tsx` render into the `#root` container provided by the extension HTML.
- `src/services/`: browser-only helpers; message bus for bridge to the extension.
- `src/types/`: web-specific types (e.g., CSS modules).

## Component conventions
- One component per file. Name files/components with PascalCase.
- Prefer named exports (`export function Foo() {}`), not default exports.
- Keep components focused; wire messaging in views or higher-level components as needed.

## TypeScript + Preact patterns
- Import hooks from `preact/hooks`.
- Use the automatic JSX runtime; import only types from `preact` when needed.
- Define an explicit `Props` interface; avoid `any`.

## CSS Modules guidelines
- Co-locate `ComponentName.module.css` per component.
- Import as `import styles from './ComponentName.module.css'` and use via `className={styles.someClass}`.
- Keep selectors flat and local; provide visible focus states.

## Messaging and VS Code bridge
- Use the webview message bus wrapper; do not call `acquireVsCodeApi` directly in components.
- Subscribe inside `useEffect` and always unsubscribe on cleanup.
- Keep event payloads typed using shared `EventPayloads`.

References:
- #[[file:packages/webview/src/services/message-bus.service.ts]]
- #[[file:packages/shared/src/shared/events.ts]]

## Views: mounting and entries
- Mount views using the Vite-configured entry files (e.g., `main-sidebar.tsx`).
- Ensure the extension HTML includes a `#root` container.

## Accessibility and UX
- Keyboard navigable; semantic elements; clear focus states.

## Import + path rules
- Use relative imports within `packages/webview`. No Node APIs; do not import extension-side modules.
- You may import shared types/constants from `packages/shared` when browser-compatible.

## Do / Don't
- Do: named exports, typed props, CSS Modules, cleanup of effects, use of message bus.
- Don't: default exports, global CSS coupling, untyped payloads, direct `acquireVsCodeApi()` in component code.
