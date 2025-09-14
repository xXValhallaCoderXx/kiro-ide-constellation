# MCP Server Implementation

## Purpose
Guide the agent in understanding and safely modifying the MCP server implementation, service layer, and core business logic. Focus on maintaining API contracts, security boundaries, and proper error handling.

## Agent Behavior Guidelines
- **API Safety**: Always validate MCP tool schemas and maintain backward compatibility
- **Security First**: Enforce workspace boundaries and path validation in all file operations
- **Error Handling**: Provide comprehensive error messages with actionable recovery steps
- **Performance**: Consider timeout handling and resource limits for long-running operations
- **Testing**: Validate changes against MCP protocol requirements and self-test functionality

## Key Conventions
- **Service Pattern**: All business logic in `src/services/` with clear separation of concerns
- **Error Handling**: Use structured error responses with appropriate HTTP status codes
- **Path Security**: Always use `SecurityService.validateAndNormalizePath()` for file operations
- **HTTP Bridge**: Loopback-only communication with bearer token authentication
- **MCP Tools**: Follow schema-first design with Zod validation

## When in Doubt
- Prefer explicit error handling over silent failures
- Always validate workspace before file operations
- Use workspace-relative paths consistently
- Test MCP tools with `--selftest` flag after changes
- Check HTTP bridge security patterns before adding new endpoints

## Inclusion Rules

### Core MCP Server Implementation
```
src/mcp.server.ts
src/extension.ts
```

### Service Layer (Business Logic)
```
src/services/dependency-cruiser.service.ts
src/services/extension-config.service.ts
src/services/graph-data.service.ts
src/services/http-bridge.service.ts
src/services/impact-analysis.service.ts
src/services/mcp-config.service.ts
src/services/message-router.service.ts
src/services/messenger.service.ts
src/services/node-version.service.ts
src/services/onboarding-mode.service.ts
src/services/onboarding-walkthrough.service.ts
src/services/security.service.ts
src/services/webview.service.ts
src/services/workspace.service.ts
```

### Shared Utilities and Types
```
src/shared/constants.ts
src/shared/graph.types.ts
```

### Extension Integration Points
```
src/side-panel-view-provider.ts
src/providers/graph-panel-provider.ts
```

**Why these files**: Core server implementation, all business logic services, shared utilities, and key integration points. Excludes test files and build outputs.

**Ranking applied**: Entry points first (mcp.server.ts, extension.ts), then services by dependency order, then shared utilities.

**Files included**: 18 files (under 25 limit)

## Notes
- Excluded `src/test/` directory - test files handled separately
- Excluded `src/personas/` - onboarding-specific content
- All files under 200KB size limit
- Focus on core server functionality and service patterns