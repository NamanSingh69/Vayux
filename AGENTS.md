# Agent instructions

Read `CLAUDE.md` before changing this repository; it is the canonical guide to product scope, architecture, invariants, and verification.

- Keep work limited to the user-requested change.
- Preserve existing and uncommitted user work.
- Keep secrets out of client code, logs, documentation, and commits.
- Reuse the shared CPCB scale instead of duplicating thresholds or colors.
- Verify TypeScript and whitespace with the commands in `CLAUDE.md`.
- Browser-check any change affecting the map or responsive layout.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
