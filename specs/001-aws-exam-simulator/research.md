# Research: AWS Cloud Practitioner Exam Simulator

**Feature Branch**: `001-aws-exam-simulator`
**Date**: 2026-02-12
**Status**: Complete

---

## 1. AWS CLF-C02 Exam Format (Verified)

### Decision: Configure simulator to match official AWS CLF-C02 specifications

**Exam Parameters**:
- **Total Questions**: 65 (50 scored + 15 unscored)
- **Time Limit**: 90 minutes
- **Passing Score**: 700 on a scaled score of 100-1000
- **Scoring Model**: Compensatory (no per-section pass required, only overall)

**Domain Breakdown** (of scored content):
| Domain | Weight | Questions (of 50 scored) |
|--------|--------|--------------------------|
| Cloud Concepts | 24% | ~12 |
| Security and Compliance | 30% | ~15 |
| Cloud Technology and Services | 34% | ~17 |
| Billing, Pricing, and Support | 12% | ~6 |

**Question Types**:
- Single-answer multiple choice (4 options, select 1)
- Multiple-response (5+ options, select 2 or more)

**Simulator Decision**: Present all 65 questions (the simulator won't distinguish scored vs unscored since we don't have AWS's unscored item pool). Score all 65 questions equally. Apply domain weighting to ensure question distribution matches percentages above.

**Rationale**: Users expect to see 65 questions in 90 minutes, matching the real exam experience. Scoring all 65 at equal weight simplifies implementation while still providing meaningful pass/fail results. The 700/1000 threshold is applied to total correct answers scaled proportionally.

**Alternatives Considered**:
- Score only 50 questions (randomly marking 15 as unscored): Adds complexity without user value; users can't distinguish which are unscored in the real exam either
- Use different question counts: Would not match real exam and reduce simulator realism

**Sources**:
- [AWS Certified Cloud Practitioner Exam Guide (PDF)](https://d1.awsstatic.com/training-and-certification/docs-cloud-practitioner/AWS-Certified-Cloud-Practitioner_Exam-Guide.pdf)
- [AWS Certification - Cloud Practitioner](https://aws.amazon.com/certification/certified-cloud-practitioner/)

---

## 2. Local Storage: expo-sqlite

### Decision: Use `expo-sqlite` for all on-device storage

**Rationale**:
- First-party Expo package, fully compatible with Expo managed workflow (no ejection needed)
- Synchronous and asynchronous API support since Expo SDK 51+
- Supports WAL mode for concurrent reads during exam auto-save
- Handles 500-1000 questions (~1MB of data) effortlessly
- No native module linking required in managed workflow
- Well-documented with active maintenance from Expo team

**Performance Considerations**:
- Create indexes on `domain` and `difficulty` columns for filtered queries (practice mode)
- Use prepared statements for repeated queries (question navigation)
- WAL journal mode enables non-blocking reads during writes (auto-save won't block UI)
- For 1000 questions, full table scan takes <10ms even without indexes

**Schema Migration Strategy**:
- Use a `schema_version` table with version number
- On app start, check current version and run sequential migration functions
- Each migration is a plain SQL transaction (e.g., `ALTER TABLE`, `CREATE INDEX`)
- No ORM migration tool needed for this scale

**Auto-Save Pattern**:
- Debounce writes: save exam state at most every 5 seconds or on question navigation
- Serialize exam state as JSON blob in `exam_sessions` table (simpler than normalized writes)
- Use `AppState` listener to save on background transition
- WAL mode ensures writes don't block concurrent reads

**Alternatives Considered**:
- `react-native-sqlite-storage`: Requires bare workflow or config plugin. More features but unnecessary complexity for managed Expo
- `@op-engineering/op-sqlite`: Fastest option (C++ bindings), but requires bare workflow. Overkill for our data volume
- `AsyncStorage`: Key-value only, no query capability. Would require loading all questions into memory
- `WatermelonDB`: Built on SQLite with observability, great for complex sync. Over-engineered for our single-direction sync (server -> device)

---

## 3. State Management: Zustand

### Decision: Use Zustand for all app state management

**Rationale**:
- Minimal API surface (~2KB bundle), no boilerplate
- No providers needed (unlike Redux/Context), reduces component tree depth
- Built-in persist middleware works with AsyncStorage for non-critical state (preferences)
- TypeScript-first with excellent type inference
- Supports slices pattern for organizing exam, practice, and analytics state separately
- Subscriptions with selectors prevent unnecessary re-renders (critical during exam with timer)

**Store Architecture**:
```
stores/
├── examStore.ts       # Active exam state (answers, timer, flags, current question)
├── practiceStore.ts   # Practice session state (filters, current question, feedback)
├── analyticsStore.ts  # Performance data (exam history, domain scores)
└── questionsStore.ts  # Question bank cache (loaded from SQLite)
```

**Key Pattern**: Exam store keeps in-memory state for fast UI updates. A `persist` subscriber periodically flushes to SQLite for crash recovery. This separates the "hot" UI state from "cold" persistence.

**Alternatives Considered**:
- `Redux Toolkit`: More structured, better devtools, but adds ~11KB and significant boilerplate. Better for large teams needing strict patterns
- `Jotai`: Atomic model is elegant but less intuitive for exam state (which is a cohesive unit, not atoms). Better for forms with independent fields
- `React Context`: No additional dependency, but causes re-render cascading. Timer updates would trigger full subtree re-renders

---

## 4. UI Navigation and Exam Flow

### Decision: React Navigation with Stack + Bottom Tab combination

**Navigation Structure**:
```
BottomTab Navigator
├── Home (Stack)
│   ├── HomeScreen
│   ├── ExamSetupScreen
│   └── PracticeSetupScreen
├── Analytics (Stack)
│   └── AnalyticsScreen
└── Settings (Stack)
    └── SettingsScreen

Modal Stack (outside tabs, covers full screen)
├── ExamScreen (with question navigator)
├── PracticeScreen
├── ReviewScreen
└── ResultsScreen
```

**Rationale**:
- Exam mode uses a modal stack that covers the tab bar (no accidental navigation away)
- Bottom tabs for main sections (3 tabs: Home, Analytics, Settings)
- Stack navigation within each tab for drill-down screens
- Modal presentation for exam/practice prevents back-navigation issues

**Question Navigation Pattern**:
- FlatList with horizontal paging for swipe navigation between questions
- Question grid overlay (bottom sheet) showing answered/flagged/current status
- Previous/Next buttons as primary navigation (swipe as secondary)
- Question number indicator: "Question 12 of 65"

**Timer Implementation**:
- Use `useRef` for interval to avoid re-renders on every tick
- Display updates via `requestAnimationFrame` for smooth countdown
- Persist remaining time to SQLite on background transition (`AppState` listener)
- On resume, recalculate remaining time from `startTime + duration - now`

**Alternatives Considered**:
- `expo-router`: File-based routing, good for web-like navigation. More opinionated but adds complexity for modal exam flows. Better for apps with web counterparts
- Single stack with conditional tabs: Simpler but harder to manage exam modal state

---

## 5. Charting Library: react-native-gifted-charts

### Decision: Use `react-native-gifted-charts` for analytics visualizations

**Rationale**:
- Pure JavaScript implementation (no native dependencies), works in Expo managed workflow
- Supports bar charts (exam scores), line charts (trends over time), and pie charts (domain breakdown)
- Animated transitions for engaging data presentation
- Actively maintained with good TypeScript support
- Smaller bundle than Victory Native (~50KB vs ~200KB)

**Charts Needed**:
- **Bar chart**: Exam score history (score per exam attempt)
- **Line chart**: Domain accuracy trends over time
- **Stacked bar or grouped bar**: Per-domain score comparison across exams
- **Pie/donut chart**: Domain distribution of incorrect answers (identify weak areas)

**Alternatives Considered**:
- `victory-native`: More feature-rich but requires `react-native-svg` and larger bundle. Better for complex interactive visualizations
- `react-native-chart-kit`: Popular but less maintained, limited chart types, and some rendering issues on newer React Native versions
- Custom SVG: Maximum control but significant development time for 4+ chart types

---

## 6. Backend Framework: Fastify

### Decision: Use Fastify for the admin API backend

**Rationale**:
- 2-3x faster than Express.js with optimized JSON serialization (important for sync payload)
- Built-in JSON Schema validation via Ajv (validate question structure on submission)
- First-class TypeScript support without @types packages
- Plugin architecture for clean separation of concerns (auth, CORS, rate limiting)
- Actively maintained (Express.js is in maintenance mode)

**Alternatives Considered**:
- `Express.js`: Industry standard, larger ecosystem. Good if team is already familiar, but Fastify's API is similar enough for easy adoption
- `Hono`: Excellent for edge runtimes (Cloudflare Workers), extremely lightweight. Better for edge deployments but our project needs traditional Node.js hosting with PostgreSQL

---

## 7. Backend ORM: Drizzle ORM

### Decision: Use Drizzle ORM with PostgreSQL for the admin backend database

**Rationale**:
- Near-zero overhead, generates SQL close to hand-written queries
- TypeScript-native with full type inference from schema definition
- No code generation step (unlike Prisma's `prisma generate`)
- Lightweight runtime (no Rust binary like Prisma's ~30MB engine)
- Built-in migration system
- SQL-like syntax gives developers direct control over queries

**Alternatives Considered**:
- `Prisma`: Better DX with Prisma Studio (free admin UI), but heavier runtime. Good choice if you want Prisma Studio as a lightweight admin panel
- `Raw pg`: Maximum performance, no abstraction overhead. More verbose and no type safety. Better for complex queries or DBA-level SQL expertise
- `Kysely`: Type-safe query builder without ORM overhead. Good middle ground but smaller community than Drizzle

---

## 8. Question Sync Strategy: Incremental with Fallback

### Decision: Timestamp-based incremental sync with full sync fallback

**Implementation**:
- Store `lastSyncTimestamp` on device
- API endpoint: `GET /api/questions/sync?since={ISO8601}`
- Response: `{ questions: [...], deletedIds: [...], timestamp: "...", checksum: "..." }`
- Full sync triggered on: first install, checksum mismatch, or user-initiated refresh

**Rationale**:
- ~1000 questions at ~1KB each = ~1MB full sync. Incremental with 10-20 updates = ~10-20KB
- Timestamp-based delta is simple and reliable for single-admin scenario
- Checksum detects data corruption; fallback to full sync ensures consistency
- Meets the 10-second sync target easily on mobile connections

**Alternatives Considered**:
- Full sync only: Simpler, ~1MB payload is acceptable. Viable for MVP but wasteful as question bank grows
- Event sourcing: Over-engineered for single-admin, single-direction sync

---

## 9. Admin Authentication: API Key

### Decision: Static API key for admin endpoints, no auth for sync endpoints

**Rationale**:
- Single admin doesn't need session management, refresh tokens, or expiration
- API key in environment variable, rotatable if compromised
- Sync endpoint is unauthenticated (paid app users have legitimate access, questions are not secret)
- Simpler than JWT: no token refresh flow, no expiration handling
- Rate limiting on admin endpoints prevents brute force

**Security Measures**:
- HTTPS required in production
- Rate limiting: 100 requests/hour per IP on admin routes
- Audit logging for all admin actions
- Key rotation every 90 days or on suspected compromise

**Alternatives Considered**:
- JWT: Better for multi-admin with role-based access. Overkill for single admin
- OAuth 2.0: Enterprise-grade, massive overkill for this use case

---

## 10. Hosting: Railway (MVP)

### Decision: Railway for MVP deployment, with AWS migration path for scale

**MVP Phase** (Railway, ~$5-20/month):
- Git-based deployment (push to deploy)
- Built-in PostgreSQL with automatic backups
- Environment variable management
- Good for validating product-market fit

**Production Phase** (AWS, ~$30-50/month):
- ECS Fargate for serverless containers
- RDS PostgreSQL for managed database
- CloudFront CDN for sync payload caching
- Aligns with AWS exam prep branding

**Alternatives Considered**:
- Render: Similar to Railway, slightly better free tier. Good alternative
- Fly.io: Best cold start performance, global edge. Better for global user base
- AWS Lambda: Cheapest at low scale but cold starts hurt sync performance

---

## 11. Admin Panel: AdminJS

### Decision: Use AdminJS for rapid admin panel development

**Rationale**:
- Auto-generates CRUD UI from Drizzle schema
- Built-in authentication, file uploads, custom actions
- Custom approval workflow via action buttons (draft -> review -> approved)
- ~500 lines of config vs ~5000 lines for custom React admin
- Works with Fastify + Drizzle stack

**Custom Actions Needed**:
- "Approve" button to transition question from draft/review to approved
- "Reject" button with reason field to send back to draft
- Bulk approve/reject for efficient content management
- Question preview showing formatted question with answer options

**Alternatives Considered**:
- Custom React Admin (React Admin/Refine): More flexibility but 10x more development effort. Migrate to this if AdminJS limitations become blocking
- Headless CMS (Strapi/Payload): Over-engineered for structured question data
- Prisma Studio: Good for development but lacks workflow features for production use

---

## Technology Stack Summary

```
Mobile App (React Native / Expo):
├── Language: TypeScript 5.x
├── Framework: React Native 0.76+ / Expo SDK 52+
├── Navigation: React Navigation 7 (Stack + Bottom Tabs)
├── State: Zustand (with persist middleware)
├── Storage: expo-sqlite (WAL mode)
├── Charts: react-native-gifted-charts
└── Testing: Jest + React Native Testing Library

Backend API:
├── Language: TypeScript 5.x / Node.js 20.x
├── Framework: Fastify
├── ORM: Drizzle ORM
├── Database: PostgreSQL
├── Admin: AdminJS
├── Auth: API Key (admin routes)
├── Hosting: Railway (MVP) → AWS ECS (scale)
└── Testing: Jest + Supertest
```
