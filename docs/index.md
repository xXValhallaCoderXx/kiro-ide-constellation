# Kiro IDE Constellation

Short, developer-focused docs for the extension architecture, message bus, and webviews.

## Overview

Two webviews (Sidebar, Dashboard) built with Preact + Vite. Extension ↔ Webviews communicate via a small, typed message bus.

- Events live in `src/shared/events.ts` (no magic strings)
- Extension bus: `src/services/message-bus.service.ts`
- Webview bus: `web/src/services/message-bus.service.ts`

## Contents

- [Events and message contracts](./events.md)
- [Message bus (extension, webview, HTTP bridge)](./message-bus.md)
- [Webview provider lifecycle](./lifecycle.md)
- [Bundle/build architecture](./bundle-architecture.md)
- [Dependency analysis](./dependency-analysis.md)
- [Recipes](./recipes.md)
