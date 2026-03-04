---
name: changelog-writer
description: Use when writing, updating, or auto-generating CHANGELOGs, release notes, or version histories. Triggers: "changelog", "release notes", "what changed", "CHANGELOG.md", "version history", or as part of every Release: workflow. Follows Keep a Changelog format and semantic versioning.
---

# Changelog Writer Skill

Write and maintain changelogs that communicate value to users and context to engineers. Always follows [Keep a Changelog](https://keepachangelog.com) format.

---

## CHANGELOG.md Format

```markdown
# Changelog

All notable changes to this project will be documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [Unreleased]
### Added
- (features in development not yet released)

---

## [2.4.0] — 2025-03-01
### Added
- User can now export data as CSV from the dashboard (#234)
- New email notification for payment failures with retry link (#241)
- API endpoint `GET /api/reports/summary` for weekly digest (#245)

### Changed
- Dashboard now loads 3× faster with server-side pagination (#238)
- Password reset emails now expire after 1h instead of 24h (#243)

### Fixed
- Login button no longer freezes on slow connections (#236)
- Fixed duplicate notifications when webhook retries (#239)
- CSV export no longer corrupts special characters (#240)

### Security
- Upgraded jsonwebtoken to 9.0.2 (fixes CVE-2022-23529) (#244)
- Added rate limiting to `/api/auth/reset-password` endpoint (#242)

### Deprecated
- `GET /api/v1/users` — use `GET /api/v2/users` (removed in 3.0.0)

### Removed
- Removed legacy Flash-based file uploader (was EOL) (#237)

---

## [2.3.1] — 2025-02-14
### Fixed
- Critical: fixed data leak in multi-tenant report endpoint (#231)

### Security
- Bumped express to 4.18.3 to patch path traversal vulnerability

---

## [2.3.0] — 2025-02-01
...

[Unreleased]: https://github.com/org/repo/compare/v2.4.0...HEAD
[2.4.0]: https://github.com/org/repo/compare/v2.3.1...v2.4.0
[2.3.1]: https://github.com/org/repo/compare/v2.3.0...v2.3.1
```

---

## Semantic Versioning Rules

```
MAJOR (1.0.0 → 2.0.0): Breaking changes
  - API endpoint removed or renamed
  - Request/response schema incompatible change
  - Behavior change that breaks existing integrations
  - Dropped support for old Node/DB version

MINOR (1.0.0 → 1.1.0): New features, backward compatible
  - New endpoint or UI feature
  - New optional parameter
  - New config option
  - Deprecation notice (not yet removed)

PATCH (1.0.0 → 1.0.1): Bug fixes, security patches
  - Bug fix that doesn't change API contract
  - Dependency security update
  - Performance improvement with no API change
  - Docs fix
```

---

## Writing Good Changelog Entries

```
BAD entries (engineer-speak, not useful):
  ✗ "Fixed bug"
  ✗ "Refactored authentication module"
  ✗ "Updated dependencies"
  ✗ "Minor improvements"
  ✗ "JIRA-234: implement CSV export"

GOOD entries (user-impact language):
  ✅ "Users can now export reports as CSV from the dashboard (#234)"
  ✅ "Login is now 40% faster on mobile devices"
  ✅ "Fixed: dashboard crashes when viewing empty project (#241)"
  ✅ "Upgraded jsonwebtoken to fix CVE-2022-23529 (no API changes)"
  ✅ "Deprecated: /api/v1/users — migrate to /api/v2/users by v3.0"

Rules:
  - Write from the user's perspective, not the engineer's
  - Link to PR/issue number: (#234)
  - For fixes: describe what was broken, not what you changed
  - For security: always include CVE number if applicable
  - For breaking changes: include migration instructions
```

---

## Auto-generate from Git Log

```bash
# Get commits since last tag
git log v2.3.1..HEAD --pretty=format:"%s (%h)" --no-merges

# Get commits with PR numbers (from squash merge titles)
git log v2.3.1..HEAD --pretty=format:"- %s" \
  | grep -E "^- (feat|fix|security|breaking|deprecate):"

# Convention: prefix commit messages to auto-sort
# feat: User CSV export (#234)       → Added
# fix: Login freeze on slow conn (#236) → Fixed
# security: Rate limit reset endpoint (#242) → Security
# breaking: Remove v1 API (#230)     → Removed + migration note
# deprecate: /api/v1/users (#229)    → Deprecated
# perf: Dashboard 3x faster (#238)   → Changed
# chore: Update deps                 → (omit from changelog)
```

---

## Release Notes Template (for GitHub Releases / Slack)

```markdown
## 🚀 v2.4.0 — March 1, 2025

**What's new:**
- 📊 Export any report as CSV from the dashboard
- 📧 Payment failure emails now include a one-click retry link
- ⚡ Dashboard loads 3× faster

**Bug fixes:**
- Login button no longer freezes on slow connections
- Duplicate webhook notifications resolved

**Security:**
- Patched CVE-2022-23529 in JWT library
- Added rate limiting to password reset endpoint

**⚠️ Deprecation notice:**
`GET /api/v1/users` will be removed in v3.0.0. Please migrate to `GET /api/v2/users`.

[Full changelog](https://github.com/org/repo/blob/main/CHANGELOG.md)
```

---

## Migration Guide Template (for MAJOR versions)

```markdown
# Migration Guide: v2.x → v3.0

## Breaking Changes

### 1. Removed: GET /api/v1/users
**Before:** `GET /api/v1/users`
**After:** `GET /api/v2/users`
**Change:** Response now returns paginated object instead of array.

Before:
```json
[{"id": 1, "name": "Alice"}]
```
After:
```json
{"data": [{"id": 1, "name": "Alice"}], "total": 1, "page": 1}
```

### 2. Auth token format changed
JWT claims now use `sub` instead of `userId`.
Update: `token.userId` → `token.sub`

## Upgrade Steps
1. Update dependency: `npm install myapp@3.0.0`
2. Update all `/api/v1/users` calls to `/api/v2/users`
3. Update JWT token claim access from `userId` to `sub`
4. Run your test suite
5. Test in staging before production
```

---

## Output Files

```
CHANGELOG.md              ← always at project root
output/releases/
  release-notes-v[X].md  ← GitHub Release / Slack announcement
  migration-v[X]-to-v[Y].md ← only for MAJOR versions
```
