---
name: incident-manager
description: Use when responding to production incidents, writing postmortems, building incident response runbooks, or establishing an on-call process. Triggers: "incident", "outage", "production down", "P1", "postmortem", "on-call", "pagerduty", "service degraded", "data loss", or when production is behaving unexpectedly and users are affected.
---

# Incident Manager Skill

Structured incident response: fast triage, clear communication, coordinated resolution, and blameless postmortems that prevent recurrence.

---

## Severity Levels

```
P1 — Critical (page immediately, all hands)
  Definition: Complete service outage OR data loss OR security breach
  Response:   < 5 min acknowledge, < 15 min first update
  Examples:   Site down, payments failing, database unreachable, data breach

P2 — High (page on-call, escalate in 15min if unresolved)
  Definition: Major feature broken for all users OR significant data quality issue
  Response:   < 15 min acknowledge, < 30 min first update
  Examples:   Login broken, exports failing, critical API returning 500s

P3 — Medium (notify, no page)
  Definition: Feature degraded for subset of users
  Response:   < 1 hour acknowledge, fix in current sprint
  Examples:   Slow queries affecting some users, non-critical integration failing

P4 — Low (ticket)
  Definition: Minor cosmetic or edge-case issue
  Response:   Fix in next sprint
```

---

## Incident Response Playbook

### Phase 1: DETECT & DECLARE (0-5 min)

```
1. Alert fires OR user reports issue
2. On-call engineer acknowledges

3. Immediately post in #incidents Slack channel:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 INCIDENT DECLARED — [P1/P2]
Time:     [HH:MM UTC]
IC:       @[your-name] (Incident Commander)
Summary:  [1 sentence — what is broken]
Impact:   [who/what is affected, estimated user count]
Status:   Investigating
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4. Open incident document (copy template below)
5. P1: Page additional responders immediately
6. P1/P2: Notify customer support team
```

### Phase 2: TRIAGE (5-15 min)

```bash
# Diagnostic checklist — run in order

# 1. Is it really broken? (eliminate false alarms)
curl -f https://yourapp.com/health && echo "OK" || echo "DOWN"

# 2. Check error rates
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name HTTPCode_Target_5XX_Count \
  --statistics Sum --period 60 \
  --start-time $(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --dimensions Name=LoadBalancer,Value=app/my-alb/xxx

# 3. Check recent deployments (most common cause)
aws ecs describe-services --cluster production --services my-app \
  --query 'services[0].deployments'

# 4. Check logs for errors
aws logs filter-log-events \
  --log-group-name /ecs/my-app \
  --start-time $(date -d '30 minutes ago' +%s000) \
  --filter-pattern "ERROR"

# 5. Check database
aws rds describe-db-instances \
  --db-instance-identifier my-app-db \
  --query 'DBInstances[0].DBInstanceStatus'
```

### Phase 3: COMMUNICATE (ongoing, every 15-30 min)

```
Post updates in #incidents at regular intervals — even if no progress:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 INCIDENT UPDATE — [HH:MM UTC]
Status:   Investigating / Identified / Mitigating / Resolved
Summary:  [What we know now]
Impact:   [Updated scope if changed]
Actions:  [What we're doing right now]
ETA:      [Best estimate, or "unknown — updating in 15min"]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Phase 4: MITIGATE (before full fix)

```
Mitigation options (fastest first):

1. ROLLBACK — if recent deploy caused it
   aws ecs update-service --cluster production --service my-app \
     --task-definition my-app:[previous-revision]

2. FEATURE FLAG — disable broken feature
   # Flip kill switch in flag config

3. SCALE UP — if traffic/capacity issue
   aws ecs update-service --cluster production --service my-app \
     --desired-count 10

4. REDIRECT — maintenance page
   # Route traffic to static maintenance page via ALB rule

5. DB FAILOVER — trigger manual failover
   aws rds reboot-db-instance \
     --db-instance-identifier my-app-db \
     --force-failover

Document mitigation: "Applied [X] at [time], impact reduced from [Y] to [Z]"
```

### Phase 5: RESOLVE

```
When system is healthy:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ INCIDENT RESOLVED — [HH:MM UTC]
Duration:  [X hours Y minutes]
Root Cause: [1 sentence]
Resolution: [What fixed it]
Follow-up:  Postmortem scheduled for [date/time]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Actions:
  [ ] Update status page
  [ ] Notify customer support to close tickets
  [ ] Schedule postmortem (within 48h for P1, 1 week for P2)
  [ ] Create follow-up tasks in backlog
```

---

## Incident Document Template

```markdown
# Incident: [INC-NNN] [Short Title]

**Declared:**    [datetime UTC]
**Resolved:**    [datetime UTC]  
**Duration:**    [X hours Y minutes]
**Severity:**    P1 / P2 / P3
**IC:**          [name]
**Responders:**  [names]

---

## Impact
- **Users affected:** [number or %]
- **Features impacted:** [list]
- **Data integrity:** [yes/no impact]
- **Revenue impact:** [estimated]

## Timeline

| Time (UTC) | Event |
|------------|-------|
| HH:MM | Alert fired: [alert name] |
| HH:MM | IC [name] acknowledged and declared incident |
| HH:MM | [What was done / discovered] |
| HH:MM | Root cause identified: [what] |
| HH:MM | Mitigation applied: [what] |
| HH:MM | Service restored |
| HH:MM | Incident resolved |

## Root Cause
[Technical explanation of WHY this happened]

## Contributing Factors
1. [Factor — e.g., "No alert on DB connection pool exhaustion"]
2. [Factor — e.g., "Deploy process doesn't check queue depth"]

## What Went Well
- [Positive: fast detection, good comms, rollback worked]

## What Went Poorly
- [Gap: missed alert, slow diagnosis, poor runbook]

## Action Items
| # | Action | Owner | Due Date | Priority |
|---|--------|-------|----------|----------|
| 1 | Add DB connection pool alert | @name | [date] | P1 |
| 2 | Update rollback runbook | @name | [date] | P2 |
| 3 | Add circuit breaker for [service] | @name | [date] | P2 |
```

---

## Blameless Postmortem Rules

```
1. BLAMELESS: Focus on systems and processes, never people
   ❌ "Alice deployed broken code"
   ✅ "The deploy pipeline allowed this change to reach production"

2. FIVE WHYS: Keep asking why until you hit systemic root cause
   Why did users see errors?     → API returned 500s
   Why did API return 500s?      → DB queries timed out
   Why did queries time out?     → Missing index on users table
   Why was index missing?        → Migration ran without review
   Why was migration unreviewed? → No gate in deploy pipeline
   Root cause: No migration review gate in CI

3. ACTION ITEMS must be SMART:
   Specific: "Add alert for DB connection count > 80%"
   Measurable: Has a done state
   Assignable: One owner
   Realistic: Can be done this sprint
   Time-bound: Due date required

4. Share postmortems widely (after action items assigned)
   Post in #engineering, link from incident ticket
   Learning compound — others avoid similar incidents
```

---

## On-Call Runbook Checklist

```markdown
## Before Your On-Call Week
- [ ] Verify PagerDuty alerts route to your phone
- [ ] Review last 3 incident postmortems
- [ ] Check if any risky deploys planned this week
- [ ] Know escalation contacts (backup + manager)

## During On-Call
- [ ] Phone charged, not on silent
- [ ] Access to AWS console, Slack, production DB (read-only)
- [ ] Know the rollback procedure for last 3 deploys

## Handoff
- [ ] Brief incoming on-call on any active issues
- [ ] Any alerts that need attention noted
- [ ] Any temporarily applied workarounds documented
```

---

## Output Files

```
output/docs/
  INCIDENT-[NNN]-[title].md       ← Incident document + postmortem
  RUNBOOK-[system].md             ← Operational runbook
  ON-CALL-GUIDE.md                ← On-call onboarding
```
