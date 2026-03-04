---
name: state-management
description: Use when implementing client-side state management. Triggers: "state management", "Zustand", "Redux", "Redux Toolkit", "global state", "store", "useContext", "state architecture", "client state", "server state vs client state", "state sharing between components", or when component prop-drilling becomes a problem.
---

# State Management Skill

Design and implement production client-state architecture. Choose the right tool for each state type — avoid over-engineering.

---

## State Decision Tree

```
Is the data fetched from a server?
  YES → React Query / SWR (not Redux/Zustand)
  NO ↓

Is it UI state local to one component?
  YES → useState / useReducer (not global store)
  NO ↓

Is it shared across many distant components?
  YES → Global store (Zustand or Redux Toolkit)
  NO ↓

Is it only shared between a subtree of components?
  YES → Context API (simple) or Zustand slice (complex)

Rule: Start with useState. Promote to Zustand when you need it.
      Never put server data in Redux/Zustand — use React Query.
```

---

## Zustand (recommended for most apps)

### Store setup pattern

```typescript
// stores/useAuthStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface User { id: string; name: string; email: string; role: string; }

interface AuthState {
  // State
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions (co-located with state — Zustand best practice)
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      immer((set) => ({
        // Initial state
        user: null,
        token: null,
        isLoading: false,
        error: null,

        // Actions
        login: async (credentials) => {
          set((state) => { state.isLoading = true; state.error = null; });
          try {
            const { user, token } = await authApi.login(credentials);
            set((state) => {
              state.user = user;
              state.token = token;
              state.isLoading = false;
            });
          } catch (err: any) {
            set((state) => {
              state.error = err.message;
              state.isLoading = false;
            });
          }
        },

        logout: () => {
          set((state) => {
            state.user = null;
            state.token = null;
          });
        },

        clearError: () => set((state) => { state.error = null; }),
        setUser:    (user) => set((state) => { state.user = user; }),
      })),
      {
        name: 'auth-store',       // localStorage key
        partialize: (state) =>    // only persist these fields
          ({ user: state.user, token: state.token }),
      }
    ),
    { name: 'AuthStore' }         // Redux DevTools label
  )
);
```

### Slice pattern for large stores

```typescript
// stores/slices/notificationSlice.ts
interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface NotificationSlice {
  notifications: Notification[];
  addNotification: (n: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

export const createNotificationSlice = (set: any): NotificationSlice => ({
  notifications: [],
  addNotification: (n) =>
    set((state: any) => {
      state.notifications.push({ ...n, id: crypto.randomUUID() });
    }),
  removeNotification: (id) =>
    set((state: any) => {
      state.notifications = state.notifications.filter((n: any) => n.id !== id);
    }),
});

// stores/useAppStore.ts — combine slices
interface AppStore extends NotificationSlice, /* other slices */ {}

export const useAppStore = create<AppStore>()(
  devtools(immer((set) => ({
    ...createNotificationSlice(set),
    // ...createOtherSlice(set),
  })))
);
```

### Selectors — prevent unnecessary re-renders

```typescript
// ✅ Selector — only re-renders when user.role changes
const userRole = useAuthStore((state) => state.user?.role);

// ✅ Computed selector
const isAdmin = useAuthStore((state) => state.user?.role === 'admin');

// ✅ Multiple fields — use shallow
import { useShallow } from 'zustand/react/shallow';
const { user, isLoading } = useAuthStore(
  useShallow((state) => ({ user: state.user, isLoading: state.isLoading }))
);

// ❌ Don't do this — re-renders on ANY store change
const store = useAuthStore();
```

---

## Redux Toolkit (for complex apps needing time-travel debugging)

### Slice

```typescript
// features/cart/cartSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

interface CartItem { id: string; name: string; price: number; quantity: number; }
interface CartState { items: CartItem[]; status: 'idle' | 'loading' | 'failed'; }

// Async thunk
export const fetchCart = createAsyncThunk('cart/fetch', async (userId: string) => {
  const response = await cartApi.getCart(userId);
  return response.data;
});

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [], status: 'idle' } as CartState,
  reducers: {
    addItem: (state, action: PayloadAction<CartItem>) => {
      const existing = state.items.find(i => i.id === action.payload.id);
      if (existing) {
        existing.quantity += 1;
      } else {
        state.items.push(action.payload);
      }
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(i => i.id !== action.payload);
    },
    clearCart: (state) => { state.items = []; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.pending,   (state) => { state.status = 'loading'; })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.status = 'idle';
        state.items = action.payload;
      })
      .addCase(fetchCart.rejected,  (state) => { state.status = 'failed'; });
  },
});

export const { addItem, removeItem, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
```

### Store

```typescript
// store/store.ts
import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import cartReducer from '../features/cart/cartSlice';

export const store = configureStore({
  reducer: {
    cart: cartReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState   = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks — always use these instead of raw useSelector/useDispatch
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

### RTK Query (server state in RTK projects)

```typescript
// services/api.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['User', 'Post'],
  endpoints: (builder) => ({
    getUsers: builder.query<User[], void>({
      query: () => '/users',
      providesTags: ['User'],
    }),
    createUser: builder.mutation<User, Partial<User>>({
      query: (body) => ({ url: '/users', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const { useGetUsersQuery, useCreateUserMutation } = api;
```

---

## Context API (for small/subtree state)

```typescript
// contexts/ThemeContext.tsx
import { createContext, useContext, useState, useMemo } from 'react';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');
  const value = useMemo(
    () => ({ mode, toggleTheme: () => setMode(m => m === 'light' ? 'dark' : 'light') }),
    [mode]
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Always export a typed hook — never use useContext directly
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
```

---

## State Architecture Patterns

### What goes where

```
useState / useReducer:
  - Form state (pre-submission)
  - Toggle state (open/closed, expanded)
  - Local UI state (active tab, hover)
  - Component-specific loading/error

React Query / SWR:
  - All server data (users, posts, orders)
  - Paginated lists
  - Infinite scroll data
  - Mutations with cache invalidation

Zustand / Redux:
  - Auth state (user + token)
  - Shopping cart
  - Notification queue
  - User preferences (theme, language)
  - Multi-step form data across pages
  - Real-time state (chat messages, live updates)

URL / Router:
  - Filters, sort order, pagination page
  - Search queries
  - Selected IDs (shareable state)
```

---

## Output Files

```
src/
  stores/
    useAuthStore.ts
    useAppStore.ts
    slices/
      notificationSlice.ts
  features/
    cart/
      cartSlice.ts
  contexts/
    ThemeContext.tsx
  store/
    store.ts         (Redux only)
```
