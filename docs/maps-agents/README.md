# MAPS Agents — Build Guide

This directory contains paste-ready system prompts for the Multi-Agent Product Development Pipeline (MAPS). Deploy these on Claude Console (Projects) or Claude Code.

## Build order (highest leverage first)

| # | Agent | File | Platform | Why first |
|---|---|---|---|---|
| 1 | BAA | `baa.md` | Console Project | Removes manual spec-writing; outputs ledger rows directly. |
| 2 | QAA | `qaa.md` | Console Project | Removes manual PR review; catches RLS / multi-tenancy bugs. |
| 3 | DevA | `deva.md` | Claude Code | Already what you use today — just formalizes the trigger prompt. |

## Agents NOT to build as LLM workers

- **MDA** — pure deterministic glue. Write as a GitHub Action or Supabase Edge Function (~30 lines).
- **CPA** — useful at industry-ideation time, but cheaper to drive interactively in a chat session than to automate.
- **KMA** — scoring rubric is tiny; you can do it in a 1-prompt chat call without a dedicated Project.
- **FAA** — binary decision based on QAA output; deterministic, no LLM needed.

## State machine

```
CPA (manual chat)
  └→ BAA (Console Project) — fills Tech Spec, Tech Implication
       └→ KMA (chat) — fills Impact, Effort, Priority
            └→ DevA (Claude Code) — fills Dev Phase, opens PR
                 └→ QAA (Console Project) — fills QA Status
                      └→ FAA (deterministic) — sets Gate Status, merges
                           └→ CPA (manual chat) — fills User Feedback, closes loop
```

## Wiring agents together

Two options:

**Option A — Manual relay (start here).** You copy outputs between agents. Slow but transparent. Use for first 3 cycles.

**Option B — GitHub-driven automation.** Each agent watches `docs/maps-ledger.md` via a workflow:

```yaml
# .github/workflows/maps-baa.yml (sketch)
on:
  push:
    paths: [docs/maps-ledger.md]
jobs:
  baa:
    if: contains(github.event.head_commit.message, 'CPA:')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          # Detect rows where Tech Spec = '—'
          # Call Claude API with BAA system prompt + that row
          # Append result back to ledger, commit, push
```

Build this only after the manual flow is boring.

## Cost estimate (per cycle, 5 rows)

- BAA: ~5k input + ~2k output per row × 5 = ~$0.40 (Sonnet 4.6)
- QAA: ~15k input (diff) + ~3k output per PR × 1 = ~$0.60 (Opus 4.7)
- DevA: $5-20 depending on feature complexity
- **Total per shipped feature: ~$6-21.**
