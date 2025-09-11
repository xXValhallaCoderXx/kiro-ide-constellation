# Kiro IDE Constellation - Project Refactor Task List

**Created:** September 11, 2025  
**Based on:** opus-4.1-repo-report.md  
**Estimated Timeline:** 4 weeks  
**Priority:** High

## Overview

This task list provides a step-by-step implementation plan for refactoring the Kiro IDE Constellation project's build system and dependency management. Tasks are organized by priority and include specific commands and file changes.

## Pre-Refactor Checklist

- [ ] Create a new branch: `git checkout -b refactor/build-system`
- [ ] Backup current working state: `git add . && git commit -m "backup: pre-refactor state"`
- [ ] Document current build times: `time npm run build`
- [ ] Record current bundle sizes: `ls -lah out/mcp/mcpStdioServer.cjs && ls -lah *.vsix`
- [ ] Install required tools:
  ```bash
  npm install -g pnpm
  npm install -g concurrently
  npm install -g npm-check-updates
  npm install -g depcheck
  ```

## Week 1: Immediate Impact (Priority 1 & 2)

### Day 1-2: Optimize MCP Bundle Size

#### Task 1.1: Analyze Current MCP Bundle
- [ ] Install bundle analyzer:
  ```bash
  npm install --save-dev esbuild-visualizer
  ```
- [ ] Create analysis script in `package.json`:
  ```json
  "analyze:mcp": "esbuild src/mcp/mcp-stdio.server.ts --bundle --platform=node --format=cjs --target=node18 --metafile=mcp-meta.json --outfile=out/mcp/mcpStdioServer.cjs && esbuild-visualizer --metadata ./mcp-meta.json --open"
  ```
- [ ] Run analysis: `npm run analyze:mcp`
- [ ] Document findings in `docs/mcp-bundle-analysis.md`

#### Task 1.2: Optimize MCP Bundle Configuration
- [ ] Create `esbuild.mcp.config.js`:
  ```javascript
  const { build } = require('esbuild');
  
  build({
    entryPoints: ['src/mcp/mcp-stdio.server.ts'],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    outfile: 'out/mcp/mcpStdioServer.cjs',
    external: ['node:*'],
    minify: true,
    treeShaking: true,
    metafile: true,
    sourcemap: true,
  }).catch(() => process.exit(1));
  ```
- [ ] Update `package.json` scripts:
  ```json
  "bundle:mcp": "node esbuild.mcp.config.js",
  "watch:mcp": "node esbuild.mcp.config.js --watch"
  ```
- [ ] Test new bundle: `npm run bundle:mcp`
- [ ] Verify size reduction (target: <50KB)

#### Task 1.3: Consider MCP SDK Externalization
- [ ] Test with SDK as external dependency:
  ```javascript
  external: ['node:*', '@modelcontextprotocol/sdk'],
  ```
- [ ] If viable, update `mcp-stdio.server.ts` to use dynamic imports
- [ ] Document decision in `docs/architecture-decisions/001-mcp-bundling.md`

### Day 3-4: Unified Vite Build System

#### Task 1.4: Create Unified Vite Configuration
- [ ] Install Vite plugins:
  ```bash
  npm install --save-dev @vitejs/plugin-node
  npm install --save-dev rollup-plugin-visualizer
  ```
- [ ] Create `vite.config.unified.ts`:
  ```typescript
  import { defineConfig } from 'vite';
  import preact from '@preact/preset-vite';
  import { resolve } from 'path';
  import { visualizer } from 'rollup-plugin-visualizer';
  
  export default defineConfig({
    plugins: [
      preact(),
      visualizer({
        filename: './bundle-stats.html',
        gzipSize: true,
      }),
    ],
    build: {
      lib: {
        entry: {
          extension: resolve(__dirname, 'src/extension.ts'),
          'mcp/mcpServer': resolve(__dirname, 'src/mcp/mcp-stdio.server.ts'),
          sidebar: resolve(__dirname, 'web/src/main-sidebar.tsx'),
          dashboard: resolve(__dirname, 'web/src/main-dashboard.tsx'),
        },
        formats: ['cjs'],
      },
      rollupOptions: {
        external: ['vscode', 'node:*'],
        output: {
          entryFileNames: '[name].js',
          assetFileNames: '[name][extname]',
        },
      },
      outDir: 'out',
      emptyOutDir: true,
      sourcemap: true,
      minify: 'esbuild',
    },
  });
  ```
- [ ] Test unified build: `vite build --config vite.config.unified.ts`
- [ ] Compare output structure with current build

#### Task 1.5: Migrate Build Scripts
- [ ] Update `package.json`:
  ```json
  {
    "scripts": {
      "build": "vite build --config vite.config.unified.ts",
      "watch": "vite build --watch --config vite.config.unified.ts",
      "build:legacy": "vite build --config web/vite.config.ts && tsc -p ./ && npm run bundle:mcp",
      "dev": "concurrently -n vite,http -c blue,green \"npm:watch\" \"npm:serve\"",
      "serve": "node out/services/http-bridge.service.js",
      "package": "npm run build && vsce package",
      "analyze": "npm run build && open bundle-stats.html"
    }
  }
  ```
- [ ] Test all build modes
- [ ] Update CI/CD scripts if applicable

### Day 5: Bundle Analysis & Optimization

#### Task 1.6: Set Up Bundle Analysis
- [ ] Configure Vite visualizer plugin (already in unified config)
- [ ] Create analysis dashboard script:
  ```bash
  #!/bin/bash
  # scripts/analyze-bundles.sh
  npm run build
  echo "Extension: $(du -sh out/extension.js)"
  echo "MCP Server: $(du -sh out/mcp/mcpServer.js)"
  echo "Sidebar: $(du -sh out/sidebar.js)"
  echo "Dashboard: $(du -sh out/dashboard.js)"
  open bundle-stats.html
  ```
- [ ] Run initial analysis and document baseline

#### Task 1.7: Initial Optimizations
- [ ] Enable tree shaking in Vite config:
  ```typescript
  rollupOptions: {
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false,
      tryCatchDeoptimization: false,
    },
  }
  ```
- [ ] Add production/development environment configs
- [ ] Test optimized builds

## Week 2-3: Foundation (Priority 3 & 4)

### Day 6-8: Workspace Structure Migration

#### Task 2.1: Plan Workspace Structure
- [ ] Create migration plan document: `docs/workspace-migration.md`
- [ ] Create directory structure:
  ```bash
  mkdir -p packages/extension/src
  mkdir -p packages/webview/src
  mkdir -p packages/mcp-server/src
  mkdir -p packages/shared/src
  ```

#### Task 2.2: Create Package Configurations
- [ ] Create `packages/extension/package.json`:
  ```json
  {
    "name": "@kiro/extension",
    "version": "0.0.5",
    "main": "./out/extension.js",
    "scripts": {
      "build": "tsc",
      "watch": "tsc --watch"
    },
    "dependencies": {
      "@kiro/shared": "workspace:*"
    }
  }
  ```
- [ ] Create `packages/webview/package.json`:
  ```json
  {
    "name": "@kiro/webview",
    "version": "0.0.5",
    "scripts": {
      "build": "vite build",
      "watch": "vite build --watch"
    },
    "dependencies": {
      "@kiro/shared": "workspace:*",
      "preact": "^10.27.1"
    }
  }
  ```
- [ ] Create `packages/mcp-server/package.json`:
  ```json
  {
    "name": "@kiro/mcp-server",
    "version": "0.0.5",
    "main": "./out/server.js",
    "scripts": {
      "build": "esbuild src/server.ts --bundle --platform=node --outfile=out/server.js",
      "watch": "npm run build -- --watch"
    },
    "dependencies": {
      "@modelcontextprotocol/sdk": "^1.17.5"
    }
  }
  ```
- [ ] Create `packages/shared/package.json`:
  ```json
  {
    "name": "@kiro/shared",
    "version": "0.0.5",
    "main": "./out/index.js",
    "types": "./out/index.d.ts",
    "scripts": {
      "build": "tsc",
      "watch": "tsc --watch"
    }
  }
  ```

#### Task 2.3: Move Source Files
- [ ] Move extension source:
  ```bash
  mv src/extension.ts packages/extension/src/
  mv src/services packages/extension/src/
  mv src/ui-providers packages/extension/src/
  ```
- [ ] Move webview source:
  ```bash
  mv web/src/* packages/webview/src/
  mv web/vite.config.ts packages/webview/
  ```
- [ ] Move MCP server:
  ```bash
  mv src/mcp/* packages/mcp-server/src/
  ```
- [ ] Move shared code:
  ```bash
  mv src/shared/* packages/shared/src/
  mv src/types packages/shared/src/
  ```

#### Task 2.4: Update Import Paths
- [ ] Update all imports to use workspace packages:
  ```typescript
  // Before
  import { Events } from '../shared/events';
  
  // After
  import { Events } from '@kiro/shared';
  ```
- [ ] Test compilation in each package
- [ ] Fix any circular dependencies

### Day 9-10: Dependency Optimization with pnpm

#### Task 2.5: Migrate to pnpm
- [ ] Create `pnpm-workspace.yaml`:
  ```yaml
  packages:
    - 'packages/*'
  ```
- [ ] Convert from npm to pnpm:
  ```bash
  pnpm import
  rm package-lock.json
  rm -rf node_modules
  pnpm install
  ```
- [ ] Update root `package.json`:
  ```json
  {
    "packageManager": "pnpm@8.0.0",
    "engines": {
      "pnpm": ">=8.0.0"
    }
  }
  ```
- [ ] Verify node_modules size reduction

#### Task 2.6: Dependency Audit
- [ ] Run dependency check:
  ```bash
  npx depcheck
  pnpm audit
  pnpm outdated
  ```
- [ ] Remove unused dependencies from each package
- [ ] Update outdated dependencies (if safe)
- [ ] Document any kept legacy dependencies

#### Task 2.7: Optimize Dependencies
- [ ] Add pnpm overrides for deduplication:
  ```json
  {
    "pnpm": {
      "overrides": {
        "typescript": "5.9.2",
        "esbuild": "0.23.1"
      }
    }
  }
  ```
- [ ] Move test dependencies to separate package:
  ```bash
  mkdir -p packages/test
  # Move @vscode/test-*, @types/mocha to packages/test
  ```
- [ ] Run `pnpm dedupe`
- [ ] Measure final node_modules size

### Day 11-12: Turbo Build Pipeline

#### Task 2.8: Set Up Turbo
- [ ] Install Turbo:
  ```bash
  pnpm add -Dw turbo
  ```
- [ ] Create `turbo.json`:
  ```json
  {
    "$schema": "https://turbo.build/schema.json",
    "pipeline": {
      "build": {
        "dependsOn": ["^build"],
        "outputs": ["out/**", "dist/**"]
      },
      "dev": {
        "cache": false,
        "persistent": true
      },
      "test": {
        "dependsOn": ["build"],
        "outputs": []
      },
      "lint": {
        "outputs": []
      }
    }
  }
  ```
- [ ] Update root scripts:
  ```json
  {
    "scripts": {
      "build": "turbo run build",
      "dev": "turbo run dev --parallel",
      "test": "turbo run test",
      "lint": "turbo run lint"
    }
  }
  ```

#### Task 2.9: Configure Build Caching
- [ ] Set up local caching:
  ```bash
  echo "node_modules/.cache/turbo" >> .gitignore
  ```
- [ ] Test cache hit/miss:
  ```bash
  pnpm build
  pnpm build  # Should show cache hits
  ```
- [ ] Document cache invalidation strategy

## Week 3: Developer Experience (Priority 5 & 6)

### Day 13-14: Improved Development Scripts

#### Task 3.1: Enhanced Dev Scripts
- [ ] Install development tools:
  ```bash
  pnpm add -Dw nodemon npm-run-all2
  ```
- [ ] Create comprehensive dev scripts:
  ```json
  {
    "scripts": {
      "dev": "run-p dev:*",
      "dev:extension": "cd packages/extension && pnpm watch",
      "dev:webview": "cd packages/webview && pnpm watch",
      "dev:mcp": "cd packages/mcp-server && pnpm watch",
      "dev:shared": "cd packages/shared && pnpm watch",
      "dev:bridge": "nodemon --watch packages/extension/out --exec node packages/extension/out/services/http-bridge.service.js",
      "logs": "tail -f .turbo/turbo-*.log",
      "clean": "turbo run clean && rm -rf node_modules/.cache",
      "clean:all": "pnpm clean && rm -rf node_modules && rm -rf packages/*/node_modules",
      "reset": "pnpm clean:all && pnpm install && pnpm build"
    }
  }
  ```

#### Task 3.2: Development Environment Setup
- [ ] Create `.env.development`:
  ```env
  VITE_SOURCE_MAP=true
  VITE_MINIFY=false
  NODE_ENV=development
  LOG_LEVEL=debug
  ```
- [ ] Create `.env.production`:
  ```env
  VITE_SOURCE_MAP=false
  VITE_MINIFY=true
  NODE_ENV=production
  LOG_LEVEL=error
  ```
- [ ] Update Vite config to use env files
- [ ] Add `.env.*` to `.gitignore`

### Day 15: Code Quality Tools

#### Task 3.3: ESLint Configuration
- [ ] Create shared ESLint config in `packages/shared/.eslintrc.js`
- [ ] Update root `eslint.config.mjs` to extend shared config
- [ ] Add lint scripts to each package:
  ```json
  "lint": "eslint src --ext .ts,.tsx",
  "lint:fix": "eslint src --ext .ts,.tsx --fix"
  ```
- [ ] Set up pre-commit hooks with husky:
  ```bash
  pnpm add -Dw husky lint-staged
  npx husky init
  ```

#### Task 3.4: TypeScript Configuration
- [ ] Create `tsconfig.base.json`:
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "module": "commonjs",
      "lib": ["ES2022"],
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "resolveJsonModule": true,
      "declaration": true,
      "declarationMap": true,
      "sourceMap": true,
      "composite": true
    }
  }
  ```
- [ ] Update each package's tsconfig to extend base
- [ ] Set up TypeScript project references
- [ ] Run type checking: `pnpm typecheck`

### Day 16-17: Production Optimizations

#### Task 3.5: Bundle Optimization
- [ ] Implement code splitting for webviews:
  ```typescript
  // packages/webview/src/main-sidebar.tsx
  import { lazy, Suspense } from 'preact/compat';
  
  const HeavyComponent = lazy(() => import('./components/HeavyComponent'));
  ```
- [ ] Configure chunk size warnings:
  ```typescript
  build: {
    chunkSizeWarningLimit: 500,
  }
  ```
- [ ] Implement dynamic imports for optional features

#### Task 3.6: Performance Monitoring
- [ ] Add build time reporting:
  ```json
  "build:timed": "time pnpm build"
  ```
- [ ] Create bundle size tracking script:
  ```bash
  #!/bin/bash
  # scripts/track-bundle-size.sh
  echo "Bundle Sizes Report - $(date)"
  echo "========================"
  find packages/*/out -name "*.js" -exec du -sh {} \;
  ```
- [ ] Set up size limit checks:
  ```bash
  pnpm add -Dw size-limit @size-limit/file
  ```

## Week 4: Testing & Documentation

### Day 18-19: Testing Setup

#### Task 4.1: Unit Testing
- [ ] Set up Vitest:
  ```bash
  pnpm add -Dw vitest @vitest/ui
  ```
- [ ] Create test configuration
- [ ] Add test scripts to each package:
  ```json
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest --coverage"
  ```
- [ ] Write tests for critical paths

#### Task 4.2: Integration Testing
- [ ] Set up VS Code extension testing
- [ ] Create test fixtures
- [ ] Write integration tests for:
  - [ ] Extension activation
  - [ ] WebView loading
  - [ ] MCP server communication
  - [ ] Message bus functionality

### Day 20: Documentation

#### Task 4.3: Update Documentation
- [ ] Update README.md with new structure
- [ ] Create CONTRIBUTING.md with development setup
- [ ] Document build system in `docs/build-system.md`
- [ ] Create architecture diagrams
- [ ] Update VS Code extension manifest

#### Task 4.4: Migration Guide
- [ ] Create `docs/migration-guide.md`
- [ ] Document breaking changes
- [ ] Provide rollback instructions
- [ ] List known issues and workarounds

## Post-Refactor Checklist

### Validation
- [ ] All tests pass: `pnpm test`
- [ ] Extension builds successfully: `pnpm build`
- [ ] VSIX packages correctly: `pnpm package`
- [ ] Extension installs and runs in VS Code
- [ ] WebViews load correctly
- [ ] MCP server responds to commands
- [ ] Message bus works between components

### Performance Metrics
- [ ] Measure and document:
  - [ ] node_modules size (target: <150MB)
  - [ ] MCP bundle size (target: <50KB)
  - [ ] Build time (target: <10s)
  - [ ] VSIX size (target: <100KB)
  - [ ] Extension activation time

### Cleanup
- [ ] Remove old build configurations
- [ ] Delete unused dependencies
- [ ] Clean up temporary files
- [ ] Update .gitignore
- [ ] Remove legacy scripts from package.json

### Release
- [ ] Create release notes
- [ ] Tag version: `git tag v0.1.0-refactor`
- [ ] Merge to main branch
- [ ] Publish to VS Code marketplace
- [ ] Announce changes to team

## Risk Mitigation

### Rollback Plan
If critical issues arise:
1. `git checkout main`
2. `git checkout -b hotfix/restore-legacy-build`
3. Restore original build scripts
4. Document issues for future attempt

### Incremental Adoption
Each week's tasks can be adopted independently:
- Week 1 changes alone provide 60% of benefits
- Week 2 can be deferred if workspace migration is too disruptive
- Week 3-4 are optional quality-of-life improvements

## Success Criteria

✅ **Must Have:**
- MCP bundle <100KB (ideally <50KB)
- Single build command works
- Extension functions correctly
- No regression in features

🎯 **Should Have:**
- node_modules <200MB
- Build time <15s
- Workspace structure implemented
- pnpm for package management

🌟 **Nice to Have:**
- Turbo build caching
- Full test coverage
- Bundle size monitoring
- Automated performance tracking

## Notes

- Keep the legacy build scripts during transition
- Test each major change in isolation
- Commit frequently with descriptive messages
- Document all decisions and trade-offs
- Involve team in architecture decisions

---

*This task list is a living document. Update task status and add notes as implementation progresses.*
