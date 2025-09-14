# Design Document

## Overview

This design outlines the comprehensive update to the Kiro Constellation steering documentation to include all onboarding features, complete MCP tool documentation, and accurate system architecture information. The update will ensure that Kiro agents have complete context about the project's capabilities when providing assistance.

## Architecture

### Current Steering Structure
The existing steering files provide good coverage of core features but are missing key onboarding capabilities:

**Existing Files:**
- `product.md` - Core product overview (needs onboarding features added)
- `tech.md` - Technology stack (complete)
- `structure.md` - Project structure (needs onboarding components added)
- `messaging.md` - Event architecture (needs onboarding message types)
- `impact-analysis.md` - Impact analysis tool (complete)
- `graph-visualization.md` - Graph visualization (complete)
- `dependency-scanning.md` - Dependency scanning (complete)

**Missing Coverage:**
- Onboarding agent tools and workflow
- Persona switching and backup system
- Walkthrough execution and management
- Complete HTTP bridge endpoint documentation
- Onboarding UI components and status management

### Design Approach

Rather than creating new files, we'll strategically update existing files to include the missing onboarding features while maintaining the current organization. This approach ensures consistency and avoids fragmentation. If required, we can rename the existing files and consolidate if it makes more sense after initial analysis.

## Components and Interfaces

### 1. Product Overview Updates (`product.md`)

**Additions Needed:**
- Complete MCP tool list (6 tools total)
- Onboarding mode capabilities
- Walkthrough generation and execution
- Persona management system

**Integration Points:**
- Link onboarding features to existing impact analysis and graph visualization
- Explain how onboarding enhances the core development workflow

### 2. Project Structure Updates (`structure.md`)

**Additions Needed:**
- Onboarding service files in `src/services/`
- Onboarding UI components in `webview-ui/src/components/`
- Persona template and backup directories
- Onboarding data storage locations

**New Components to Document:**
- `src/services/onboarding-mode.service.ts`
- `src/services/onboarding-walkthrough.service.ts`
- `webview-ui/src/components/OnboardingModeToggle.tsx`
- `webview-ui/src/components/OnboardingStatus.tsx`
- `.constellation/onboarding/` directory structure
- `.constellation/steering/backup/` directory structure

### 3. Messaging Architecture Updates (`messaging.md`)

**Additions Needed:**
- Complete HTTP bridge endpoint documentation
- Onboarding-specific message types
- Persona switching message flow
- Walkthrough execution messaging

**New Endpoints to Document:**
- `POST /persona` - Mode switching
- `POST /onboarding/commitPlan` - Plan execution
- `POST /onboarding/nextStep` - Step progression
- `POST /scan` - Dependency scanning trigger

**New Message Types:**
- `onboarding/change-mode`
- `onboarding/get-mode`
- `onboarding/get-status`
- `onboarding/mode-changed`
- `onboarding/status-update`
- `onboarding/walkthrough-complete`

### 4. New Onboarding Documentation (`onboarding.md`)

**Create New Comprehensive File:**
Since onboarding is a major feature set, create a dedicated steering file that covers:
- Complete onboarding workflow
- MCP tool specifications
- Persona management lifecycle
- Walkthrough execution patterns
- Error handling and recovery
- Integration with existing features

## Data Models

### Onboarding Plan Structure
```typescript
interface OnboardingPlan {
  version: number;
  topic: string;
  createdAt: string;
  steps: OnboardingStep[];
}

interface OnboardingStep {
  filePath: string;
  lineStart: number;
  lineEnd: number;
  explanation: string;
}
```

### Persona Backup Structure
```
.constellation/steering/backup/
├── 2025-01-15T10-30-45/
│   ├── product.md
│   ├── tech.md
│   └── [other steering files]
└── 2025-01-16T14-22-10/
    └── [backup files]
```

### Walkthrough Status
```typescript
interface WalkthroughStatus {
  isActive: boolean;
  currentStep?: number;
  totalSteps?: number;
  currentFile?: string;
  explanation?: string;
}
```

## Error Handling

### Onboarding Mode Switching
- Backup creation failures
- Persona template write errors
- Restoration failures with fallback to empty steering
- Permission issues with directory creation

### Walkthrough Execution
- Missing dependency graph data
- File access errors during step execution
- Plan parsing and validation errors
- Step progression failures

### HTTP Bridge Communication
- Token authentication failures
- Loopback connection issues
- Request parsing errors
- Endpoint not found handling

## Testing Strategy

### Documentation Validation
- Verify all documented features exist in codebase
- Cross-reference file paths and component names
- Validate message type definitions match implementation
- Ensure HTTP endpoint documentation is accurate

### Consistency Checks
- Ensure terminology is consistent across all steering files
- Verify cross-references between files are accurate
- Check that examples match actual implementation
- Validate that all MCP tools are documented

## Implementation Notes

### File Update Strategy
1. **Incremental Updates**: Update existing files first to maintain continuity
2. **New File Creation**: Create comprehensive onboarding.md for detailed coverage
3. **Cross-Reference Updates**: Ensure all files reference each other appropriately
4. **Validation Pass**: Review all changes for accuracy and completeness

### Content Organization
- Keep technical details in appropriate files (tech.md for stack, structure.md for architecture)
- Use onboarding.md for workflow and process documentation
- Update product.md for high-level feature overview
- Enhance messaging.md with complete communication patterns

### Maintenance Considerations
- Document the relationship between steering files and actual implementation
- Provide clear guidance on when to update steering docs
- Include references to source files for verification
- Maintain consistency with existing documentation in docs/ directory