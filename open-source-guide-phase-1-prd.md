# Open Source Contribution Agent - Phase 1 PRD

## Executive Summary

Building on the successful Onboarding Agent POC, we're creating a second specialized agent mode: **Open Source Contribution Agent**. This mode transforms Constellation into an intelligent assistant for contributing to open source projects by analyzing codebases, processing GitHub issues, and generating actionable implementation plans.

### Vision Statement
*Enable developers to confidently contribute to any open source project by providing AI-powered codebase analysis, issue interpretation, and implementation guidance.*

---

## Current Architecture Analysis

### Onboarding Agent Pattern (Reusable Foundation)
The existing onboarding mode provides a proven architecture we can adapt:

**Mode Management:**
- `OnboardingModeService` - handles mode switching with backup/restore of steering docs
- `OnboardingModeToggle.tsx` - Preact UI component with confirmation dialogs
- Persona files in `.kiro/steering/` directory for AI context switching

**AI Integration:**  
- MCP tools (`constellation_onboarding.*`) registered in `mcp.server.ts`
- HTTP bridge pattern for extension ↔ MCP server communication
- Structured plan generation and step-by-step execution

**File Management:**
- Safe backup/restore of steering documents during mode switches
- Temporary files in `.constellation/` for operation state
- Validation and security checks for file operations

---

## Problem Statement

**Current Pain Points:**
1. **Intimidating Codebase Entry** - New contributors struggle to understand unfamiliar project structures
2. **Issue Context Gap** - GitHub issues lack sufficient context about implementation approach  
3. **Inconsistent Contribution Quality** - Without project-specific guidance, PRs often miss style/pattern expectations
4. **Manual Triage Process** - Contributors must manually analyze codebase to understand how to implement features

**Target User Journey:**
1. Developer finds interesting open source project
2. Clones repository locally
3. Switches to "Open Source" mode in Constellation
4. Provides GitHub issue URL they want to work on
5. Receives comprehensive analysis and implementation plan
6. Follows generated PRD to create compliant contribution

---

## Solution Architecture

### Core Components

#### 1. **OpenSourceModeService** (Backend)
*Pattern: Mirror `OnboardingModeService` architecture*

```typescript
class OpenSourceModeService {
  private currentMode: ExtensionMode
  private readonly OPEN_SOURCE_PERSONA_FILE = 'open-source-contributor.md'
  
  async switchToOpenSource(): Promise<void>
  async switchToDefault(): Promise<void>  
  private async writeOpenSourcePersona(): Promise<void>
}
```

**Responsibilities:**
- Mode switching with steering document backup/restore
- Generate open source persona template 
- Manage `.constellation/oss/` working directory

#### 2. **OpenSourceModeToggle.tsx** (UI)
*Pattern: Extend existing `OnboardingModeToggle` component*

**New Mode Options:**
- Default
- Onboarding  
- **Open Source** *(new)*

**UI Enhancements:**
- Three-way mode selector using `SelectDropdown`
- Mode-specific confirmation dialogs
- Status indicators for active OSS analysis

#### 3. **GitHubIssueService** (Backend)
*New service for GitHub API integration*

```typescript
class GitHubIssueService {
  async fetchIssue(issueUrl: string): Promise<GitHubIssue>
  async parseIssueComments(issueNumber: number, repo: string): Promise<Comment[]>
  private validateGitHubUrl(url: string): boolean
  private stripPII(issueData: any): GitHubIssue
}
```

**Security Features:**
- PII stripping from issue content
- Optional GitHub token for rate limit management
- Workspace-relative path validation

#### 4. **CodebaseAnalysisService** (Backend)  
*New service leveraging existing graph data*

```typescript
class CodebaseAnalysisService {
  async analyzeProjectStructure(): Promise<ProjectAnalysis>
  async identifyRelevantFiles(issue: GitHubIssue): Promise<string[]>
  async generateImplementationStrategy(issue: GitHubIssue, files: string[]): Promise<Strategy>
}
```

**Reuses Existing Infrastructure:**
- Dependency graph from `GraphDataService`
- File type detection from `file-type.service.ts`  
- Graph traversal utilities

### MCP Tools Integration

#### New MCP Tools (Mirror onboarding pattern)

```typescript
// constellation_opensource.analyze
server.registerTool("constellation_opensource.analyze", {
  title: "Analyze Codebase for OSS Contribution",
  description: "Performs comprehensive codebase analysis for open source contribution planning"
})

// constellation_opensource.fetchIssue  
server.registerTool("constellation_opensource.fetchIssue", {
  title: "Fetch GitHub Issue",
  description: "Fetches and processes GitHub issue data for contribution planning"
})

// constellation_opensource.generatePRD
server.registerTool("constellation_opensource.generatePRD", {
  title: "Generate Implementation PRD", 
  description: "Creates detailed PRD for implementing the GitHub issue solution"
})
```

---

## Feature Specification

### Phase 1 MVP Features

#### 1. **Mode Toggle & Initialization**
**User Story:** *As a developer, I want to easily switch to Open Source mode so I can get specialized assistance for OSS contributions.*

**Acceptance Criteria:**
- [ ] Three-way mode selector in side panel: Default | Onboarding | Open Source
- [ ] Switching to OSS mode backs up current steering docs  
- [ ] Auto-generates `open-source-contributor.md` persona file
- [ ] Creates `.constellation/oss/` working directory
- [ ] Shows confirmation dialog explaining mode purpose

**Technical Implementation:**
- Extend `OnboardingModeToggle.tsx` with third option
- Create `OpenSourceModeService` mirroring onboarding service
- Update extension config to persist mode state

#### 2. **Codebase Analysis** 
**User Story:** *As a contributor, I want the agent to understand the project structure so it can provide contextually appropriate guidance.*

**Acceptance Criteria:**
- [ ] Automatically scans project on mode activation
- [ ] Identifies key architectural patterns (MVC, microservices, etc.)
- [ ] Detects coding standards from existing files  
- [ ] Maps important directories and their purposes
- [ ] Generates project-specific contribution guidelines

**Technical Implementation:**
- Leverage existing dependency graph from `GraphDataService`
- Analyze file patterns and naming conventions
- Use AST parsing for code style detection
- Store analysis in `.constellation/oss/project-analysis.json`

#### 3. **GitHub Issue Processing**
**User Story:** *As a contributor, I want to provide a GitHub issue URL and receive processed, actionable information about what needs to be implemented.*

**Acceptance Criteria:**
- [ ] Accepts GitHub issue URLs (issues and PRs)
- [ ] Fetches issue title, description, and comments via GitHub API
- [ ] Strips PII and sensitive information  
- [ ] Identifies issue type (bug, feature, documentation, etc.)
- [ ] Extracts technical requirements and acceptance criteria
- [ ] Stores processed data in `.constellation/oss/issue-{number}.json`

**Technical Implementation:**
- New `GitHubIssueService` with GitHub API client
- URL parsing and validation utilities
- PII detection and removal algorithms
- Rate limiting and error handling

#### 4. **Implementation PRD Generation**
**User Story:** *As a contributor, I want a detailed implementation plan that respects the project's conventions so I can create a high-quality PR.*

**Acceptance Criteria:**
- [ ] Generates comprehensive PRD in project root as `oss-implementation-{issue-number}.md`
- [ ] Includes file-by-file implementation strategy
- [ ] Suggests test approaches and files to modify
- [ ] Provides coding style guidelines specific to project  
- [ ] Estimates implementation complexity
- [ ] Lists potential edge cases and considerations

**Technical Implementation:**
- New MCP tool `constellation_opensource.generatePRD`
- Template-based PRD generation with project-specific customization
- Integration with existing graph analysis for impact assessment

### Phase 1 User Workflow

```
1. User clones OSS repository
   ↓
2. Opens in VS Code with Constellation extension
   ↓  
3. Switches to "Open Source" mode in side panel
   ↓
4. Extension analyzes codebase automatically
   ↓
5. User provides GitHub issue URL via command or UI
   ↓
6. Extension fetches and processes issue data
   ↓
7. AI generates comprehensive implementation PRD
   ↓
8. User follows PRD to implement solution
```

---

## Technical Implementation Plan

### File Structure Changes

```
src/
├── services/
│   ├── open-source-mode.service.ts          # Mode management (new)
│   ├── github-issue.service.ts              # GitHub API client (new)
│   ├── codebase-analysis.service.ts         # Project analysis (new)
│   └── open-source-walkthrough.service.ts   # Workflow orchestration (new)
├── personas/
│   └── open-source-contributor.md           # AI persona template (new)
└── mcp.server.ts                           # Add OSS MCP tools (modified)

webview-ui/src/components/
├── OpenSourceModeToggle.tsx                 # Extended mode selector (modified)
└── OpenSourceStatus.tsx                    # OSS-specific status display (new)

.constellation/
├── oss/                                    # OSS mode working directory (new)
│   ├── project-analysis.json
│   ├── issue-{number}.json
│   └── implementation-plan.json
└── data/                                   # Existing graph data (reused)

{project-root}/
└── oss-implementation-{issue-number}.md    # Generated PRD (new)
```

### Development Phases

#### **Sprint 1: Foundation** (5 days)
- [ ] Create `OpenSourceModeService` based on onboarding service pattern
- [ ] Extend UI toggle component for three-way mode selection  
- [ ] Implement basic mode switching with steering doc backup/restore
- [ ] Create open source persona template
- [ ] Add mode persistence in extension config

#### **Sprint 2: Analysis Engine** (7 days) 
- [ ] Build `CodebaseAnalysisService` leveraging existing graph data
- [ ] Implement project structure detection algorithms
- [ ] Create coding style analysis using AST parsing
- [ ] Generate project-specific guidelines automatically
- [ ] Add analysis caching and invalidation

#### **Sprint 3: GitHub Integration** (5 days)
- [ ] Develop `GitHubIssueService` with API client
- [ ] Implement URL parsing and validation
- [ ] Add PII detection and removal capabilities  
- [ ] Create issue data storage and retrieval
- [ ] Handle rate limiting and authentication

#### **Sprint 4: PRD Generation** (8 days)
- [ ] Build PRD generation engine with AI integration
- [ ] Create implementation strategy algorithms  
- [ ] Design PRD templates with project customization
- [ ] Add file impact analysis using dependency graph
- [ ] Implement complexity estimation

#### **Sprint 5: Integration & Polish** (5 days)
- [ ] End-to-end workflow testing
- [ ] Error handling and user feedback
- [ ] Documentation and help content
- [ ] Performance optimization
- [ ] UI/UX improvements

### Risk Mitigation

**Technical Risks:**
- *GitHub API rate limiting* → Implement request caching and optional token auth
- *Large codebase analysis performance* → Incremental analysis with background processing  
- *AI output quality variance* → Template-based generation with validation
- *Security concerns with external data* → Strict PII removal and input validation

**Complexity Risks:**
- *Feature creep beyond MVP* → Strict scope definition and phased rollout
- *Integration complexity with existing services* → Reuse proven patterns from onboarding mode
- *User experience fragmentation* → Consistent UI patterns and clear mode transitions

---

## Success Metrics

### Phase 1 KPIs
- **Adoption Rate:** 60% of Constellation users try OSS mode within 30 days
- **Completion Rate:** 80% of users who enable OSS mode successfully generate a PRD
- **Quality Score:** Generated PRDs include 5+ specific implementation details
- **User Satisfaction:** 4.2/5.0 average rating in extension reviews mentioning OSS features

### User Success Indicators
- Time from issue identification to implementation plan < 10 minutes
- Generated PRDs require minimal manual editing (< 20% content changes)
- Implementation plans correctly identify 90%+ of files requiring changes
- Contribution quality improvement measurable via PR acceptance rates

---

## Future Enhancements (Phase 2+)

### Advanced Analysis Features
- **Multi-issue analysis** for complex feature implementations
- **PR review simulation** with automated feedback before submission
- **Testing strategy generation** with specific test case recommendations
- **Documentation impact analysis** for features requiring doc updates

### Collaboration Features  
- **Team coordination** for multi-contributor features
- **Mentor matching** connecting newcomers with project maintainers
- **Progress tracking** with implementation milestone checkpoints

### Intelligence Improvements
- **Learning from merged PRs** to improve future suggestions
- **Project-specific model fine-tuning** based on historical contributions
- **Community feedback integration** from issue comments and PR reviews

---

## Conclusion

The Open Source Contribution Agent represents a natural evolution of Constellation's capabilities, leveraging the proven onboarding mode architecture to solve a new class of developer problems. By combining intelligent codebase analysis with GitHub issue processing and AI-powered implementation planning, we can significantly lower the barrier to open source contribution while improving contribution quality.

The phased approach ensures we can validate core assumptions early while building toward a comprehensive solution that could become the standard tool for open source contributors worldwide.

**Next Steps:**
1. Technical validation of GitHub API integration approach
2. User research with 3-5 active OSS contributors for workflow validation  
3. Stakeholder approval for 30-day development timeline
4. Sprint 1 kickoff with foundation development

*This PRD serves as the foundation for Phase 1 development and will be iteratively refined based on implementation learnings and user feedback.*
