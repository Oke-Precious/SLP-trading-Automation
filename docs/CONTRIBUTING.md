# AutoSLP Contribution Ledger & Operational SLAs

Welcome! This repository documents standards for fixing software issues, deploying updates, maintaining code quality metrics, and participating in AutoSLP development sprints.

---

## ─── PART A: ISSUE TRACKING SETUP & SLAs ───

All developer reports and suggestions are tracked within GitHub Issues.

### 1. Label Schematics

| Label | Color | Code Namespace | Use Case |
|:---|:---|:---|:---|
| `bug:critical` | Red | `#D93F0B` | System down, transaction execution failures, data loss, severe authentication security breaches. |
| `bug:high` | Orange | `#F9A01B` | Core signaling/plotting logic block broken, affecting multiple live trading participants. |
| `bug:medium` | Yellow | `#F2C94C` | Dynamic features degraded, reliable workarounds exist to preserve operations. |
| `bug:low` | Blue | `#2F80ED` | UI rendering discrepancy, cosmetic layout shift, spacing typo block. |
| `enhancement` | Green | `#27AE60` | New analytics overlays or dashboard utility suggestions. |
| `performance` | Purple | `#9B51E0` | Heavy CPU loop paths, socket leakage triggers, memory expansion. |
| `security` | Dark Red | `#EB5757` | Vulnerabilities, endpoint exploits, leakages of auth tokens. |
| `documentation`| Grey | `#828282` | Outdated runbooks, API specification inaccuracies. |
| `good-first-issue` | Teal | `#11A5A5` | Low effort files/components, suitable for external contributors. |
| `wontfix` | Black | `#333333` | Intentionally retained features or closed issues. |

### 2. Service Level Agreements (SLA) by Severity

| Severity Level | Response Acknowledgment SLA | Hotfix/Patch Deploy SLA | Target Window Definition |
|:---|:---|:---|:---|
| **Critical** | **&le; 1 Hour** | **&le; 4 Hours** | Immediate off-cycle hotfix deployment. |
| **High** | **&le; 4 Hours** | **&le; 24 Hours** | Priority path hotfix deployment. |
| **Medium** | &le; 24 Hours | &le; 7 Days | Scheduled within the active 1-week sprint. |
| **Low** | &le; 48 Hours | Monthly Release | Incorporated into the next scheduled monthly release version. |

---

## ─── PART B: STANDARD BUG FIX WORKFLOW ───

For every incoming bug assigned to development, you **MUST** strictly adhere to this sequence:

```
[1. REPRODUCE] ──► [2. INVESTIGATE] ──► [3. BRANCH] ──► [4. MINIMAL FIX]
                                                               │
                                                               ▼
[8. DEPLOY] ◄── [7. PR APPROVAL] ◄── [6. CHANGELOG] ◄── [5. WORKFLOW TEST]
     │
     ▼
[9. METRIC VERIFY] ──► [10. RESOLVED CLOSE]
```

1. **REPRODUCE**: Identify and confirm the bug in a local sandbox workspace. Write a **failing automated unit test** demonstrating the error.
2. **INVESTIGATE ROOT CAUSE**: Trace container logs, analyze user steps, and review relevant telemetry actions.
3. **BRANCH**: Move off main and checkout a named target issue tracking branch:
   ```bash
   git checkout -b fix/issue-123-description
   ```
4. **FIX**: Apply the **minimal code changes** to address the issue. Refactoring unrelated lines of code in the same PR is strictly forbidden to prevent review spillover.
5. **TEST**: Run your suite. Verify that:
   * The failing test written in Step 1 now passes.
   * All existing system tests still execute reliably.
   * (For UI bugs): Run pixel regression tests by asserting CSS matches.
6. **DOCUMENT**: Record details of your changes in `CHANGELOG.md` inside `docs`:
   ```markdown
   - [FIXED] Brief description of what was broken (issue #123)
   ```
7. **PULL REQUEST (PR)**: Create your pull request referencing the target issue containing the exact text `Fixes #123`. The branch requires **at least 1 peer approval** prior to merge blocks.
8. **DEPLOY**: Merge the approved PR. GitHub Actions automatically builds the production asset and streams updates onto the staging cluster. Manual promotion to production is triggered after staging automated regression passes.
9. **VERIFY**: Open Grafana / Prometheus metrics dashboards 30 minutes post-deployment. Ensure error rates hold flat.
10. **CLOSE**: Add a comment detailing the fix and close the issue.

---

## ─── PART D: MONTHLY CODE QUALITY MAINTENANCE ───

Keep codebase standards green by performing these routine tasks (toggled on team calendars):

### Week 1: Dependency Auditing chores
* Trigger dependency auditing and flag outdated version chains:
  ```bash
  npm audit && npm outdated
  ```
* Review package versions and check package changelogs for breaking changes. Compile tests after each dependency update.

### Week 2: Error and Coverage Auditing chores
* Scan active error logs dashboard to resolve false positives and assign remaining issues to sprints.
* Review test coverage. Ensure all core logic files preserve a **minimum threshold of 70% coverage**. Add targets for low density files.
* Execute clean exports and dead code detection sweeps:
  ```bash
  npx ts-prune
  ```

### Week 3: Performance Tuning chores
* Launch Lighthouse CI routines against main dashboard endpoints (Target Score: **&ge; 90 Performance**).
* Inspect analytics trends, identifying degradations in database querying or latency loops.
* Extract slow query queries from PostgreSQL. Run analytical structure queries using `EXPLAIN ANALYZE`:
  ```sql
  EXPLAIN ANALYZE SELECT * FROM "POI" WHERE "userId" = '...' AND "status" = 'ACTIVE';
  ```

### Week 4: Security Inspection chores
* Inspect gateway logs for security footprints or rate blockages.
* Scan `audit_logs` database entities, reviewing administrative permissions sweeps.
* Rotate development, staging, and production JWT secret tokens safely.
* Check security mailing logs and close any CVE package advisories.
