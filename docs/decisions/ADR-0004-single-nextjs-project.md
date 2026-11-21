---
title: A single Next.js project, no monorepo
status: accepted
date: 2026-11-18
---

# ADR-0004 — A single Next.js project, no monorepo

## Context

The app is small, has no database and no other consumer of its code.

## Decision

A single Next.js project (App Router, TypeScript) with pnpm, Biome, Vitest, Playwright and a GitHub Actions CI. No Turborepo, no domain packages, no Drizzle.

## Consequences

- Less configuration to maintain.
- Layering lives in the folders of `src/`: `lib` for business glue, `utils` for generic helpers, `components` for shared UI.

## Alternatives considered

- **Turborepo monorepo with domain packages**: rejected, there is no second consumer and no database to isolate.
