# Graph Report - castor  (2026-10-22)

## Corpus Check
- 11 files · ~78,371 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 55 nodes · 45 edges · 11 communities (9 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- package.json
- Architecture
- Appendix: glossary
- castor bot
- setup.js
- Worker lifecycle
- job-state.js

## God Nodes (most connected - your core abstractions)
1. `Appendix: glossary` - 9 edges
2. `Architecture` - 8 edges
3. `castor bot` - 5 edges
4. `scripts` - 3 edges
5. `Components` - 3 edges
6. `Worker lifecycle` - 3 edges
7. `engines` - 2 edges
8. `engines` - 2 edges
9. `Job lifecycle` - 2 edges
10. `photo` - 1 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (11 total, 2 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.22
Nodes (8): engines, node, name, private, scripts, setup, start, type

### Community 1 - "Architecture"
Cohesion: 0.15
Nodes (12): Architecture, Build order, Components, Deferred, Isolation constraints, Job lifecycle, Queue, The trust boundary (+4 more)

### Community 2 - "Appendix: glossary"
Cohesion: 0.22
Nodes (9): Appendix: glossary, Configuration, Container layer, Kubernetes control plane, Machine layer, Networking, Project components, Storage (+1 more)

### Community 3 - "castor bot"
Cohesion: 0.33
Nodes (5): castor bot, Changing name, description or avatar, First run, Requirements, Useful checks

### Community 6 - "Worker lifecycle"
Cohesion: 0.29
Nodes (6): engines, node, exports, name, private, type

## Knowledge Gaps
- **33 isolated node(s):** `photo`, `name`, `private`, `type`, `start` (+28 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Architecture` connect `Architecture` to `Appendix: glossary`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Why does `Appendix: glossary` connect `Appendix: glossary` to `Architecture`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **What connects `photo`, `name`, `private` to the rest of the system?**
  _33 weakly-connected nodes found - possible documentation gaps or missing edges._