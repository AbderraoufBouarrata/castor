# Graph Report - castor  (2026-10-22)

## Corpus Check
- 40 files · ~94,093 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 405 nodes · 450 edges · 23 communities (19 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `822bf176`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- Architecture
- Appendix: glossary
- castor bot
- setup.js
- index.js
- Worker lifecycle
- job-state.js
- Job.ts
- commonInputTypes.ts
- prismaNamespaceBrowser.ts
- JobDelegate
- PrismaClient
- package.json
- Prisma__JobClient
- PrismaClientBaseOptions
- castor job-api
- @castor/core
- jobs.js

## God Nodes (most connected - your core abstractions)
1. `JobDelegate` - 18 edges
2. `PrismaClient` - 11 edges
3. `reply()` - 10 edges
4. `castor bot` - 9 edges
5. `castor job-api` - 9 edges
6. `Appendix: glossary` - 9 edges
7. `Architecture` - 8 edges
8. `jobsController()` - 7 edges
9. `scripts` - 6 edges
10. `jobs()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `jobs()` --indirect_call--> `formatJob()`  [INFERRED]
  apps/bot/commands/jobs.js → apps/bot/helpers/format.js
- `handle()` --calls--> `reply()`  [EXTRACTED]
  apps/bot/index.js → apps/bot/helpers/telegram.js
- `buildApp()` --indirect_call--> `jobsController()`  [INFERRED]
  apps/job-api/app.js → apps/job-api/controllers/jobs.js
- `jobsController()` --indirect_call--> `requireToken()`  [INFERRED]
  apps/job-api/controllers/jobs.js → apps/job-api/hooks/auth.js
- `build()` --calls--> `api()`  [EXTRACTED]
  apps/bot/commands/build.js → apps/bot/helpers/api.js

## Import Cycles
- 3-file cycle: `apps/job-api/generated/prisma/internal/prismaNamespace.ts -> apps/job-api/generated/prisma/models.ts -> apps/job-api/generated/prisma/models/Job.ts -> apps/job-api/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `apps/job-api/generated/prisma/commonInputTypes.ts -> apps/job-api/generated/prisma/internal/prismaNamespace.ts -> apps/job-api/generated/prisma/models.ts -> apps/job-api/generated/prisma/commonInputTypes.ts`

## Communities (23 total, 4 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.22
Nodes (8): engines, node, name, private, scripts, setup, start, type

### Community 1 - "Architecture"
Cohesion: 0.09
Nodes (21): Appendix: glossary, Architecture, Build order, Components, Configuration, Container layer, Deferred, Isolation constraints (+13 more)

### Community 2 - "Appendix: glossary"
Cohesion: 0.02
Nodes (105): Args, At, AtLeast, AtLoose, AtStrict, BatchPayload, BigIntFieldRefInput, Boolean (+97 more)

### Community 3 - "castor bot"
Cohesion: 0.20
Nodes (9): castor bot, Changing name, description, avatar or command menu, Commands, First run, How it fits, Layout, Requirements, Scripts (+1 more)

### Community 5 - "index.js"
Cohesion: 0.29
Nodes (10): build(), help(), jobs(), api(), formatJob(), STATE_EMOJI, reply(), telegram() (+2 more)

### Community 6 - "Worker lifecycle"
Cohesion: 0.29
Nodes (6): engines, node, exports, name, private, type

### Community 11 - "Job.ts"
Cohesion: 0.03
Nodes (64): AggregateJob, BigIntFieldUpdateOperationsInput, DateTimeFieldUpdateOperationsInput, EnumJobStateFieldUpdateOperationsInput, GetJobAggregateType, GetJobGroupByPayload, JobAggregateArgs, JobAvgAggregateInputType (+56 more)

### Community 12 - "commonInputTypes.ts"
Cohesion: 0.06
Nodes (32): BigIntFilter, BigIntWithAggregatesFilter, DateTimeFilter, DateTimeNullableFilter, DateTimeNullableWithAggregatesFilter, DateTimeWithAggregatesFilter, EnumJobStateFilter, EnumJobStateWithAggregatesFilter (+24 more)

### Community 13 - "prismaNamespaceBrowser.ts"
Cohesion: 0.17
Nodes (9): $Enums, Job, JobScalarFieldEnum, ModelName, NullsOrder, NullTypes, QueryMode, SortOrder (+1 more)

### Community 15 - "PrismaClient"
Cohesion: 0.12
Nodes (4): config, LogOptions, PrismaClient, PrismaClientConstructor

### Community 16 - "package.json"
Cohesion: 0.11
Nodes (17): dependencies, fastify, @prisma/adapter-pg, @prisma/client, devDependencies, prisma, engines, node (+9 more)

### Community 18 - "PrismaClientBaseOptions"
Cohesion: 0.67
Nodes (3): PrismaClientBaseOptions, PrismaClientOptionsWithAccelerateUrl, PrismaClientOptionsWithAdapter

### Community 20 - "castor job-api"
Cohesion: 0.20
Nodes (9): API, castor job-api, Changing the schema, Commands, First run, Layout, Requirements, Useful checks (+1 more)

### Community 21 - "@castor/core"
Cohesion: 0.40
Nodes (4): @castor/core, Commands, Contents, Usage

### Community 22 - "jobs.js"
Cohesion: 0.08
Nodes (27): buildApp(), create(), get(), jobsController(), list(), present(), db, createJobDto (+19 more)

## Knowledge Gaps
- **286 isolated node(s):** `photo`, `STATE_EMOJI`, `COMMANDS`, `name`, `private` (+281 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `JobDelegate` connect `JobDelegate` to `Job.ts`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `@prisma/client` connect `package.json` to `jobs.js`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **What connects `photo`, `STATE_EMOJI`, `COMMANDS` to the rest of the system?**
  _286 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Architecture` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `Appendix: glossary` be split into smaller, more focused modules?**
  _Cohesion score 0.018867924528301886 - nodes in this community are weakly interconnected._
- **Should `Job.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.03076923076923077 - nodes in this community are weakly interconnected._
- **Should `commonInputTypes.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._