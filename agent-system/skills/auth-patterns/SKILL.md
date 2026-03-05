---
name: "auth-patterns"
description: "Use when implementing authentication or authorization. Triggers: \"auth\", \"login\", \"JWT\", \"OAuth\", \"session\", \"RBAC\", \"permissions\", \"refresh token\", \"protected route\", \"access control\", \"role-based\", \"SSO\", \"Google login\", \"logout\", or any security feature involving user identity. Covers full backend+frontend auth implementation."
---


# Auth Patterns Skill

Implement production-grade authentication and authorization: JWT with refresh tokens, OAuth 2.0, RBAC, protected routes, and secure token storage.

---

## JWT + Refresh Token Flow (recommended standard)

```
┌─────────────┐  POST /auth/login           ┌─────────────┐
│   Client    │ ─────────────────────────→  │   Server    │
│             │  ←── { accessToken, set-cookie: refreshToken }
│             │                             │             │
│  (15 min)   │  GET /api/data             │             │
│  access     │  Authorization: Bearer {accessToken}      │
│  token      │ ─────────────────────────→ │             │
│  stored in  │  ←── 200 OK { data }       │             │
│  memory     │                             │             │
│             │  ←── 401 Unauthorized       │             │
│  (7 days)   │                             │             │
│  refresh    │  POST /auth/refresh         │             │
│  token in   │  (cookie sent automatically)│             │
│  httpOnly   │ ─────────────────────────→ │             │
│  cookie     │  ←── { new accessToken }    │             │
└─────────────┘                             └─────────────┘

Key security decisions:
  accessToken  → in memory (JS variable/store) — NOT localStorage
  refreshToken → httpOnly cookie — NOT accessible to JS
  CSRF protection → SameSite=Strict or CSRF token
```

---

## Backend: Auth Routes (Express + JWT)

```typescript
// routes/auth.ts
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User';
import { rateLimit } from 'express-rate-limit';

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                      // 5 attempts per window
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8),
});

// POST /auth/login
router.post('/login', authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const { email, password } = parsed.data;

  // Timing-safe: always check password even if user not found (prevent enumeration)
  const user = await User.findOne({ where: { email } });
  const passwordMatch = user
    ? await bcrypt.compare(password, user.passwordHash)
    : await bcrypt.compare(password, '$2b$12$invalidhashforenumprotection');

  if (!user || !passwordMatch) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (!user.emailVerified) {
    return res.status(403).json({ error: 'Please verify your email first' });
  }

  const accessToken  = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Store refresh token hash in DB (allows invalidation)
  await user.update({ refreshTokenHash: await bcrypt.hash(refreshToken, 10) });

  // Refresh token → httpOnly cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
    path: '/auth/refresh',              // only sent to this endpoint
  });

  return res.json({
    accessToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

// POST /auth/refresh
router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });

  try {
    const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!) as any;
    const user = await User.findByPk(payload.sub);
    if (!user?.refreshTokenHash) return res.status(401).json({ error: 'Invalid session' });

    const valid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!valid) return res.status(401).json({ error: 'Invalid session' });

    const newAccessToken  = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    await user.update({ refreshTokenHash: await bcrypt.hash(newRefreshToken, 10) });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true, secure: true, sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, path: '/auth/refresh',
    });

    return res.json({ accessToken: newAccessToken });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// POST /auth/logout
router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (refreshToken) {
    try {
      const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!) as any;
      await User.update({ refreshTokenHash: null }, { where: { id: payload.sub } });
    } catch { /* token already invalid — still clear cookie */ }
  }
  res.clearCookie('refreshToken', { path: '/auth/refresh' });
  return res.json({ message: 'Logged out' });
});

// Token helpers
function generateAccessToken(user: any) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.ACCESS_TOKEN_SECRET!,
    { expiresIn: '15m', issuer: 'myapp', audience: 'myapp-client' }
  );
}

function generateRefreshToken(user: any) {
  return jwt.sign(
    { sub: user.id },
    process.env.REFRESH_TOKEN_SECRET!,
    { expiresIn: '7d' }
  );
}

export default router;
```

---

## Backend: Auth Middleware

```typescript
// middleware/authenticate.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string; };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const token = auth.slice(7);
    const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!, {
      issuer: 'myapp', audience: 'myapp-client',
    }) as any;
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// RBAC middleware factory
export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Usage:
// router.get('/admin', authenticate, authorize('admin', 'superadmin'), handler);
```

---

## Frontend: Auth Store + Axios Interceptor

```typescript
// stores/useAuthStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from '../lib/axios';

interface AuthState {
  user: User | null;
  accessToken: string | null;    // in memory — NOT in localStorage via persist
  isLoading: boolean;
  login: (creds: Credentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<string | null>;
}

export const useAuthStore = create<AuthState>()(
  // Only persist user profile — never the token
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,

      login: async (credentials) => {
        set({ isLoading: true });
        const { data } = await axios.post('/auth/login', credentials);
        set({ user: data.user, accessToken: data.accessToken, isLoading: false });
      },

      logout: async () => {
        await axios.post('/auth/logout').catch(() => {}); // fire and forget
        set({ user: null, accessToken: null });
      },

      refreshTokens: async () => {
        try {
          const { data } = await axios.post('/auth/refresh');
          set({ accessToken: data.accessToken });
          return data.accessToken;
        } catch {
          set({ user: null, accessToken: null });
          return null;
        }
      },
    }),
    { name: 'auth-user', partialize: (state) => ({ user: state.user }) }
  )
);
```

```typescript
// lib/axios.ts — with auto-refresh interceptor
import axios from 'axios';
import { useAuthStore } from '../stores/useAuthStore';

const api = axios.create({ baseURL: '/api', withCredentials: true });

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 &&
        error.response?.data?.code === 'TOKEN_EXPIRED' &&
        !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          refreshQueue.push((token) => {
            if (token) {
              original.headers.Authorization = `Bearer ${token}`;
              resolve(api(original));
            } else {
              reject(error);
            }
          });
        });
      }

      isRefreshing = true;
      const newToken = await useAuthStore.getState().refreshTokens();
      isRefreshing = false;

      refreshQueue.forEach(cb => cb(newToken));
      refreshQueue = [];

      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## Frontend: Protected Routes

```tsx
// components/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  redirectTo?: string;
}

export function ProtectedRoute({ children, requiredRole, redirectTo = '/login' }: ProtectedRouteProps) {
  const { user } = useAuthStore();
  const location = useLocation();

  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(user.role)) {
      return <Navigate to="/403" replace />;
    }
  }

  return <>{children}</>;
}

// Usage in routes:
// <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
// <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminPanel /></ProtectedRoute>} />
```

---

## RBAC Permission System

```typescript
// lib/permissions.ts
type Role = 'admin' | 'editor' | 'viewer';
type Resource = 'users' | 'posts' | 'settings';
type Action = 'create' | 'read' | 'update' | 'delete';

const PERMISSIONS: Record<Role, Partial<Record<Resource, Action[]>>> = {
  admin:  { users: ['create','read','update','delete'], posts: ['create','read','update','delete'], settings: ['read','update'] },
  editor: { users: ['read'], posts: ['create','read','update'], settings: ['read'] },
  viewer: { users: ['read'], posts: ['read'], settings: [] },
};

export function can(role: Role, resource: Resource, action: Action): boolean {
  return PERMISSIONS[role]?.[resource]?.includes(action) ?? false;
}

// React hook
export function usePermissions() {
  const role = useAuthStore((state) => state.user?.role as Role);
  return {
    can: (resource: Resource, action: Action) => role ? can(role, resource, action) : false,
  };
}

// Usage:
// const { can } = usePermissions();
// {can('posts', 'delete') && <DeleteButton />}
```

---

## Security Checklist

- [ ] Passwords hashed with bcrypt (cost factor ≥ 12)
- [ ] Access tokens: short-lived (15min), signed HS256/RS256
- [ ] Refresh tokens: httpOnly cookie, SameSite=Strict, path-restricted
- [ ] Refresh tokens stored as hash in DB (allows revocation)
- [ ] Rate limiting on /login, /register, /reset-password
- [ ] Prevent user enumeration (same response for wrong email/password)
- [ ] Email verification before first login
- [ ] HTTPS only in production (Secure cookie flag)
- [ ] Token rotation on every refresh
- [ ] Logout invalidates refresh token in DB
- [ ] RBAC enforced server-side (never trust client role)
