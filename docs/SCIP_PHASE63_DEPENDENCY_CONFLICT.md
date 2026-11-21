# SCIP Phase 6.3 Dependency Conflict

## Conflict
Root declares esbuild@0.25.12 (direct dev dependency). Vite@8.3.7 requires esbuild ^0.27.0 || ^0.28.0 (peerOptional). tsx@4.23.15 uses esbuild@0.28.2.

## Root Cause
- Root esbuild@0.25.12 is too old for Vite 8.3.7.
- Vite 8.3.7 expects esbuild ^0.27.0 or ^0.28.0.
- tsx pulls esbuild@0.28.2 (satisfies vite).

## Proposed Solutions
1. Update root esbuild to ^0.28.0 (aligns with vite+tsx). Requires approval.
2. Create isolated E2E test package with own deps (avoids root changes). Recommended.

## Recommendation
Option 2: isolated E2E package. No root dependency changes needed. Playwright installed in isolated dir.

## Risks
- Option 1 changes root deps (could affect build).
- Option 2 adds complexity but safer.

## Status
Awaiting user approval for either option.
EOF