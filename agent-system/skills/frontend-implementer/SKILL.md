---
name: frontend-implementer
description: Use when building React components, pages, hooks, or frontend features. Triggers: "React", "component", "frontend", "create a page", "form", hooks, state management, or after UI design is approved.
---

# Frontend Implementer Skill

Build production-ready React components with proper state, error handling, loading states, and tests.

---

## Stack
React 18 | Tailwind CSS | React Router | React Hook Form | React Query | Jest + RTL

---

## Component Structure

```
components/
  [Feature]/
    [Feature].jsx          → main component
    [Feature].test.jsx     → tests
    components/            → sub-components
    hooks/
      use[Feature].js      → feature-specific hook
```

---

## Component Types

**Presentational (dumb)** — pure UI, no business logic:
```jsx
function UserCard({ user, onEdit, onDelete }) {
  return (
    <div className="rounded-lg border p-4 flex items-center gap-3">
      <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
      <div className="flex-1">
        <p className="font-semibold">{user.name}</p>
        <p className="text-sm text-gray-500">{user.email}</p>
      </div>
      <button onClick={() => onEdit(user.id)} className="btn-secondary">Edit</button>
      <button onClick={() => onDelete(user.id)} className="btn-danger">Delete</button>
    </div>
  );
}
```

**Container (smart)** — handles state, data fetching, business logic:
```jsx
function UserListPage() {
  const { data: users, isLoading, error } = useQuery('users', fetchUsers);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorState message="Couldn't load users" onRetry={() => refetch()} />;
  if (!users?.length) return <EmptyState message="No users yet" action="Add user" />;

  return (
    <div className="space-y-2">
      {users.map(user => <UserCard key={user.id} user={user} />)}
    </div>
  );
}
```

---

## Always Include These States

```jsx
// Every data-fetching component needs all 4:
if (isLoading) return <LoadingSkeleton />;
if (error) return <ErrorState message={error.message} onRetry={refetch} />;
if (!data?.length) return <EmptyState />;
return <MainContent data={data} />;
```

---

## Form Pattern (React Hook Form)

```jsx
import { useForm } from 'react-hook-form';

function LoginForm({ onSubmit }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Email address</label>
        <input
          type="email"
          placeholder="you@example.com"
          className={`input ${errors.email ? 'input-error' : ''}`}
          {...register('email', {
            required: 'Email is required',
            pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email' }
          })}
        />
        {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
      </div>

      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
```

---

## Custom Hook Pattern

```javascript
// hooks/useAuth.js
function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      verifyToken(token).then(setUser).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    const { user, token } = await authApi.login(credentials);
    localStorage.setItem('token', token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return { user, isLoading, login, logout, isAuthenticated: !!user };
}
```

---

## Reusable Components (Always Create)

```jsx
// Always create these for any new feature:
<LoadingSpinner size="sm|md|lg" />
<ErrorState message={string} onRetry={fn} />
<EmptyState message={string} action={string} onAction={fn} />
<ConfirmDialog message={string} onConfirm={fn} onCancel={fn} />
```

---

## Test Template

```jsx
// [Feature].test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginForm from './LoginForm';

describe('LoginForm', () => {
  it('shows validation error for invalid email', async () => {
    render(<LoginForm onSubmit={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
  });

  it('calls onSubmit with form values', async () => {
    const mockSubmit = jest.fn();
    render(<LoginForm onSubmit={mockSubmit} />);
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'test@example.com' }
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(mockSubmit).toHaveBeenCalledWith({ email: 'test@example.com' }));
  });
});
```

---

## Accessibility Checklist

- [ ] All inputs have associated labels
- [ ] Buttons have descriptive text (not just "click here")
- [ ] Images have `alt` text
- [ ] Focus visible on all interactive elements
- [ ] Error messages linked to inputs via `aria-describedby`
- [ ] Loading states announced via `aria-live`
- [ ] Color is not the only indicator of state
