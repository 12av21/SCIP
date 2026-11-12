# SCIP — Known Limitations and Open Blockers

**Project:** Smart Community Intelligence Platform (SCIP)  
**Date:** 2026-11-11  
**Status:** Evidence-based and intentionally conservative. Items below prevent `SECURITY VERIFIED`, `RUNTIME VERIFIED` (exhaustive), `DATABASE MIGRATION VERIFIED` (runtime/cutover), or `PRODUCTION READY` claims.

## 1. Critical blockers (approval/architecture)

| Limitation | Impact | Current state | Needed to close |
|---|---|---|---|
| **MongoDB runtime not integrated/cut over** | No Mongo-backed production/runtime path; split-brain risk if forced | JSON active by default/fallback; Mongo repo scaffold with fail-loud non-parity ops; models/connection/migration tooling exist | Full behavioral parity, async-safe integration, isolated end-to-end parity tests, backup/rollback, explicit approval, controlled cutover |
| **Phase 6 migration incomplete for runtime** | Data load verified in isolation only | `scip_dev` snapshot load executed/idempotent with matching counts/refs/audit; `.scip_database.json` unchanged | Runtime verification, cutover rehearsal, operational migration governance |
| **No formal security/production certification** | Cannot claim verified/ready posture | Substantial hardening + 361 isolated assertions | Exhaustive proof, deployed validation, ops controls, sign-off |

## 2. Security and authorization gaps

| Limitation | Impact | Notes |
|---|---|---|
| Exhaustive authz/workflow matrix unproven | Potential untested edge cases | Representative coverage exists; full role×endpoint×method×state/transition matrix required |
| Pattern-based PII/redaction | Sensitive data may evade redaction | `audit.details` and other free-form fields need stronger structured controls and review |
| Audit is detect-only in-app | Tampering detected but not externally prevented/recovered | No WORM/immutable sink, no automated repair policy, backup/restore not fully evidenced |
| In-memory rate limiting | Ineffective across processes/instances; bypassable in distributed setups | Single-process best-effort; needs shared store/proxy/WAF strategy |
| CSP/CORS/runtime deployment not fully validated | Policy mismatch or breakage in production | Baseline/prod-only CSP configured in code; frontend/proxy/TLS fit unverified |
| Session/token edge compatibility | Legacy behavior nuances documented | Operational token/session policy and monitoring needed |

## 3. Persistence and operational limitations

| Limitation | Impact | Notes |
|---|---|---|
| JSON file-backed runtime is single-process | Concurrency/HA/scaling constraints | No distributed transactions; file locking/backup discipline required |
| No verified backup/restore/DR runbooks | Data recovery risk | Procedures not execution-verified in this workspace |
| Health/status reporting is informational | Not a full readiness guarantee | `mongoRepositoryIntegrated: false` expected; runtime remains JSON |
| Build artifact size warning | Performance/load implications possible | Vite chunk > 500 kB warning recorded (non-failing) |

## 4. Testing and CI limitations

| Limitation | Impact | Notes |
|---|---|---|
| No exhaustive e2e/browser automation recorded | UI/runtime regressions possible | Frontend behavior largely validated indirectly |
| Limited fuzz/property/concurrency/load testing | Robustness under abuse/stress unknown | Targeted hardening tests only |
| CI validates isolated checks, not deployment | Runtime misconfiguration possible | Environment-specific gates and staged validation needed |

## 5. AI/ML and product limitations

| Limitation | Impact | Notes |
|---|---|---|
| Decision-support only, probabilistic outputs | False positives/negatives possible | Human review/verification required; not autonomous authority |
| Local heuristic/statistical methods, limited evaluation | No production ML accuracy/certification claim | Metrics/dataset-quality are diagnostic, not guarantees |
| Optional FastAPI service not integrated/certified | Inconsistent capabilities if enabled ad hoc | Local TS pipeline is primary implemented path |
| Explainability/risk scores are model outputs | May be incomplete or context-sensitive | Must be presented with uncertainty and governance |

## 6. Documentation and process caveats

- Reports and matrices are **evidence-based snapshots**, not legal/compliance certifications.
- Some endpoint behaviors depend on runtime data/state and may require further negative-case validation.
- Any future scope/permission/privacy changes require explicit approval and synchronized code/test/doc updates.

## 7. Explicit non-claims

- **Not production ready.**
- **Not security verified.**
- **Not runtime-verified for exhaustive scenarios.**
- **Not database-migration/cutover verified** (beyond isolated snapshot load evidence).
- **Not a substitute** for penetration testing, compliance audit, or operational readiness review.

## 8. Preserved constraints

- `.scip_database.json` must not be modified/reset/migrated/overwritten.
- No production/Atlas/existing external DB usage without explicit approval and safeguards.
- No deployment/push/commit actions implied by this document.
- No secrets, JWTs, API keys, or PII should be logged or published.
