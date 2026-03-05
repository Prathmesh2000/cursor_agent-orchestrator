---
name: "git-workflow"
description: "Use for git branching strategy, commit conventions, PR workflows, merge strategies, conflict resolution, git history cleanup, or tagging releases. Triggers: \"git\", \"branch\", \"commit\", \"PR\", \"pull request\", \"merge\", \"rebase\", \"conflict\", \"tag release\", \"gitflow\", \"trunk based\", or when establishing or following a team git workflow."
---


# Git Workflow Skill

Establish and execute professional git workflows — branching strategy, commit conventions, PR process, merge strategy, and release tagging.

---

## Branching Strategy

### Trunk-Based Development (Recommended for small/fast teams)

```
main (production-ready at all times)
  ├── feature/[ticket-id]-short-description   ← max 2 days
  ├── fix/[ticket-id]-bug-description
  ├── chore/update-dependencies
  └── release/v1.2.0                          ← optional stabilization branch
```

Rules:
- Branch from `main` always
- Merge back to `main` within 2 days max
- Feature flags for incomplete features
- Deploy from `main` directly

### GitFlow (For scheduled release cycles)

```
main          ← production, tagged releases only
develop       ← integration branch

feature/[id]-description  ← branches from develop
release/v1.2.0            ← branches from develop, merges to main + develop
hotfix/[id]-critical-fix  ← branches from main, merges to main + develop
```

---

## Branch Naming

```
Format: [type]/[ticket-id]-short-kebab-description

Types:
  feature/  → new functionality
  fix/      → bug fix
  hotfix/   → critical production fix
  chore/    → dependencies, tooling, config
  docs/     → documentation only
  test/     → test additions
  refactor/ → code improvement, no behavior change
  release/  → release preparation

Examples:
  feature/PROJ-123-user-authentication
  fix/PROJ-456-login-redirect-loop
  hotfix/PROJ-789-payment-null-pointer
  chore/upgrade-node-18
  release/v2.1.0
```

---

## Commit Message Convention (Conventional Commits)

```
Format: <type>(<scope>): <subject>
        [blank line]
        [body — optional]
        [blank line]
        [footer — optional]

Types:
  feat      → new feature (triggers minor version bump)
  fix       → bug fix (triggers patch version bump)
  breaking  → breaking change (triggers major version bump)
  chore     → tooling, deps, build
  docs      → documentation
  test      → add or fix tests
  refactor  → no behavior change
  perf      → performance improvement
  style     → formatting only (no logic change)
  ci        → CI/CD pipeline changes
  revert    → reverts previous commit

Subject rules:
  - lowercase, imperative ("add" not "added" or "adds")
  - max 72 characters
  - no period at end

Examples:
  feat(auth): add JWT refresh token rotation
  fix(login): prevent redirect loop on expired session
  chore(deps): upgrade express from 4.18 to 4.19
  docs(api): add authentication endpoint examples
  test(auth): add unit tests for token validation
  
  feat(payments)!: replace Stripe with Braintree
  
  BREAKING CHANGE: PaymentService API changed.
  chargeCard() now requires amount in dollars, not cents.
  Update all callers: chargeCard(50) → chargeCard(0.50)
  
  Closes #PROJ-234
```

---

## Daily Git Workflow

### Starting a Feature

```bash
# Always start from latest main
git checkout main
git pull origin main

# Create branch
git checkout -b feature/PROJ-123-add-notifications

# First commit to establish branch remotely
git commit --allow-empty -m "chore: init feature/PROJ-123-add-notifications"
git push -u origin feature/PROJ-123-add-notifications
```

### During Development

```bash
# Commit frequently with clear messages
git add -p                          # stage hunks interactively (not git add .)
git commit -m "feat(notif): add notification model and migration"

# Keep branch up to date (daily)
git fetch origin
git rebase origin/main              # preferred over merge — keeps history linear

# Push progress
git push origin feature/PROJ-123-add-notifications
```

### Before Creating PR

```bash
# Final rebase to clean up commits
git rebase -i origin/main           # squash WIP commits, reword messages

# Run all checks locally
npm run lint
npm test
npm run build

# Push final
git push origin feature/PROJ-123-add-notifications --force-with-lease
```

---

## PR Description Template

```markdown
## Summary
[2-3 sentences: what this PR does and why]

## Changes
- [Specific change 1]
- [Specific change 2]

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing done (describe steps)

## Screenshots (if UI changes)
[Before/After screenshots]

## Related
Closes #[ticket-id]
Depends on #[PR number] (if applicable)

## Checklist
- [ ] Code reviewed by self first
- [ ] No console.logs left in code
- [ ] Environment variables documented
- [ ] Breaking changes documented
```

---

## Merge Strategy

```bash
# SQUASH MERGE — for feature branches (recommended)
# One clean commit per feature on main history
git merge --squash feature/PROJ-123-add-notifications
git commit -m "feat(notif): add user notification system (#123)"

# REBASE MERGE — for small, already-clean branches
git rebase origin/main
git checkout main
git merge --ff-only feature/PROJ-123-add-notifications

# MERGE COMMIT — for release branches (preserves history)
git merge --no-ff release/v1.2.0 -m "chore: merge release/v1.2.0"
```

---

## Conflict Resolution

```bash
# When rebase hits a conflict:
git rebase origin/main
# CONFLICT in src/services/auth.service.js

# 1. Open file — look for conflict markers
# <<<<<<< HEAD (your changes)
# ======= (separator)
# >>>>>>> origin/main (incoming changes)

# 2. Resolve manually — keep what's correct
# (or use: git checkout --ours file.js | git checkout --theirs file.js)

# 3. Stage resolved file
git add src/services/auth.service.js

# 4. Continue rebase
git rebase --continue

# If it's a mess — abort and retry
git rebase --abort
```

---

## Release Tagging

```bash
# Semantic versioning: MAJOR.MINOR.PATCH
# feat commits → MINOR bump (1.1.0 → 1.2.0)
# fix commits  → PATCH bump (1.2.0 → 1.2.1)
# BREAKING     → MAJOR bump (1.2.0 → 2.0.0)

# Create annotated tag (preferred over lightweight)
git tag -a v1.2.0 -m "Release v1.2.0 — Add notification system"

# Push tags
git push origin v1.2.0
# or push all tags:
git push origin --tags

# Delete wrong tag
git tag -d v1.2.0
git push origin --delete v1.2.0

# Tag a specific past commit
git tag -a v1.1.5 abc1234 -m "Release v1.1.5 — Security patch"
```

---

## Git History Cleanup

```bash
# Interactive rebase — clean up last 5 commits before PR
git rebase -i HEAD~5

# Commands in editor:
# pick   → keep as-is
# reword → keep but edit message
# edit   → pause to amend
# squash → combine into previous commit (keep all messages)
# fixup  → combine into previous commit (discard this message)
# drop   → delete this commit

# Undo last commit but keep changes staged
git reset --soft HEAD~1

# Undo last commit and unstage changes
git reset --mixed HEAD~1

# Emergency: restore deleted file
git checkout HEAD~1 -- path/to/file.js

# Find lost commit
git reflog
git cherry-pick abc1234
```

---

## Git Aliases (Add to ~/.gitconfig)

```ini
[alias]
  st = status -sb
  co = checkout
  br = branch
  lg = log --oneline --graph --decorate --all
  aa = add -A
  cm = commit -m
  pushf = push --force-with-lease
  wip = !git add -A && git commit -m "chore: wip"
  undo = reset --soft HEAD~1
  conflicts = diff --name-only --diff-filter=U
  clean-branches = !git branch --merged main | grep -v main | xargs git branch -d
```
