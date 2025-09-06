# Kiro IDE Constellation Docs

A developer-focused guide to the extension architecture, message bus, and UI/webview patterns.

- Getting started
- Events and message contracts
- Extension-side message bus
- Webview-side message bus
- Webview provider lifecycle
- Recipes

## Overview

Kiro IDE Constellation provides a Sidebar webview and a Dashboard webview built with Preact + Vite. Communication between the extension (Node/VS Code host) and the webviews (browser sandbox) uses a small, typed message bus.

- Shared events live in `src/shared/events.ts` (no hard-coded strings).
- Extension bus implementation in `src/services/messageBus.ts`.
- Webview bus wrapper in `web/src/services/messageBus.ts`.

## Contents

- [Events and message contracts](./events.md)
- [Extension-side message bus](./extension-bus.md)
- [Webview-side message bus](./webview-bus.md)
- [Webview provider lifecycle](./lifecycle.md)
- [Recipes](./recipes.md)
