---
name: feature-flags
description: Use when implementing feature flags, gradual rollouts, A/B testing, kill switches, canary releases, or dark launches. Triggers: "feature flag", "feature toggle", "gradual rollout", "canary", "A/B test", "kill switch", "dark launch", "LaunchDarkly", "percentage rollout", or when deploying risky features that need controlled exposure.
---

# Feature Flags Skill

Implement feature flags for safe deployments: gradual rollouts, kill switches, A/B tests, and per-user targeting. Separate deployment from release.

---

## Flag Types

```
Release flags     → Hide incomplete features until ready (short-lived)
Kill switches     → Emergency disable without deploy (ops flags)
Experiment flags  → A/B test variants (temporary)
Permission flags  → Enable features per user/tier (long-lived)
Ops flags         → Toggle infra behavior (circuit breakers, timeouts)
```

---

## Lightweight In-House Implementation

```javascript
// services/featureFlags.js — no third-party dependency
class FeatureFlagService {
  constructor(flagsConfig, userContext = null) {
    this.flags = flagsConfig;  // loaded from DB or config
    this.user = userContext;
  }

  isEnabled(flagName) {
    const flag = this.flags[flagName];
    if (!flag) return false;
    if (!flag.enabled) return false;

    // Percentage rollout
    if (flag.rolloutPercent !== undefined && flag.rolloutPercent < 100) {
      if (!this.user?.id) return false;
      const hash = this._hashUser(this.user.id, flagName);
      return hash < flag.rolloutPercent;
    }

    // User allowlist
    if (flag.allowedUserIds?.length) {
      return flag.allowedUserIds.includes(this.user?.id);
    }

    // Role targeting
    if (flag.allowedRoles?.length) {
      return flag.allowedRoles.includes(this.user?.role);
    }

    return true;
  }

  // Deterministic hash: same user always gets same bucket
  _hashUser(userId, flagName) {
    const str = `${userId}:${flagName}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash) % 100;
  }
}

// Flag configuration shape
const flagConfig = {
  'new-checkout-flow': {
    enabled: true,
    rolloutPercent: 10,      // 10% of users
    description: 'New checkout UX',
    owner: 'payments-team',
    createdAt: '2024-01-15',
    expiresAt: '2024-02-15', // stale flag alert after this
  },
  'ai-suggestions': {
    enabled: true,
    allowedUserIds: ['user-123', 'user-456'],  // beta users
    description: 'AI writing suggestions',
    owner: 'ai-team',
  },
  'maintenance-mode': {
    enabled: false,           // kill switch — flip to true in emergency
    description: 'Emergency maintenance mode',
    owner: 'platform-team',
  },
};

// Middleware: attach flags to every request
app.use(async (req, res, next) => {
  const flags = await getFlagsFromDB();     // or cache
  req.flags = new FeatureFlagService(flags, req.user);
  next();
});

// Usage in route
app.get('/api/checkout', async (req, res) => {
  if (req.flags.isEnabled('new-checkout-flow')) {
    return newCheckoutController(req, res);
  }
  return legacyCheckoutController(req, res);
});
```

---

## Database Schema for Flags

```sql
CREATE TABLE feature_flags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL UNIQUE,
  enabled     BOOLEAN NOT NULL DEFAULT false,
  config      JSONB NOT NULL DEFAULT '{}',
  -- config: { rolloutPercent, allowedUserIds, allowedRoles, variants }
  description TEXT,
  owner       VARCHAR(100),
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX feature_flags_name_idx ON feature_flags(name);
CREATE INDEX feature_flags_enabled_idx ON feature_flags(enabled) WHERE enabled = true;
```

---

## React Integration (Frontend Flags)

```jsx
// context/FeatureFlagContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';

const FlagContext = createContext({});

export function FeatureFlagProvider({ userId, userRole, children }) {
  const [flags, setFlags] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/feature-flags', {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
      .then(r => r.json())
      .then(data => { setFlags(data.flags); setLoading(false); });
  }, [userId]);

  return (
    <FlagContext.Provider value={{ flags, loading }}>
      {children}
    </FlagContext.Provider>
  );
}

export function useFlag(flagName) {
  const { flags } = useContext(FlagContext);
  return flags[flagName] === true;
}

// Usage in component
function CheckoutPage() {
  const useNewFlow = useFlag('new-checkout-flow');
  return useNewFlow ? <NewCheckout /> : <LegacyCheckout />;
}

// Feature gate component
export function Feature({ flag, fallback = null, children }) {
  const enabled = useFlag(flag);
  return enabled ? children : fallback;
}

// Usage
<Feature flag="ai-suggestions" fallback={<BasicEditor />}>
  <AIEnhancedEditor />
</Feature>
```

---

## A/B Test Variant Assignment

```javascript
// For experiment flags with multiple variants
function getVariant(flagName, userId, variants = ['control', 'treatment']) {
  const hash = hashUser(userId, flagName);
  const bucket = hash % variants.length;
  return variants[bucket];
}

// Track variant assignment for analysis
async function getExperimentVariant(userId, experimentName) {
  const assignment = await db('experiment_assignments')
    .where({ user_id: userId, experiment: experimentName })
    .first();

  if (assignment) return assignment.variant;

  const variant = getVariant(experimentName, userId);
  await db('experiment_assignments').insert({
    user_id: userId, experiment: experimentName, variant,
    assigned_at: new Date(),
  });

  // Track in analytics
  analytics.track('Experiment Assigned', { userId, experimentName, variant });
  return variant;
}
```

---

## Flag Hygiene Rules

```
Creation:
  ✅ Every flag has: name, owner, description, expires_at
  ✅ Name is kebab-case: 'new-payment-flow' not 'newPaymentFlow'
  ✅ Short-lived flags expire within 30 days
  ✅ Permanent flags (permissions) documented as long-lived

Cleanup:
  ❌ Flag has been 100% rolled out for > 2 weeks → delete flag + code
  ❌ Experiment concluded → remove variant branches + flag
  ✅ Stale flag alert: CI checks for flags past expires_at
  ✅ Each flag removal is its own PR (easier to review)

Testing:
  ✅ Test both flag-on and flag-off paths
  ✅ Never test internal flag state — test behavior
  ✅ Integration tests use flag overrides, not real flag state
```

---

## Flag Override for Testing

```javascript
// In tests: override flags without DB
const mockFlags = {
  isEnabled: (name) => name === 'new-checkout-flow',
};

req.flags = mockFlags;

// Or use an env variable override in development
const overrides = process.env.FLAG_OVERRIDES
  ? JSON.parse(process.env.FLAG_OVERRIDES)
  : {};
// FLAG_OVERRIDES='{"new-checkout-flow":true,"ai-suggestions":false}'
```

---

## Output Files

```
output/code/
  services/featureFlags.js         ← Core flag service
  middleware/featureFlagMiddleware.js
  context/FeatureFlagContext.jsx    ← React context
output/docs/
  FEATURE-FLAGS.md                 ← Flag registry + guidelines
```
