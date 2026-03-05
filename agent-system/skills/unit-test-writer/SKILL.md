---
name: "unit-test-writer"
description: "Use when writing unit tests for functions, classes, services, controllers, hooks, or any isolated code unit. Triggers: \"write unit tests\", \"test this function\", \"unit test for\", \"add tests\", \"test coverage\", \"jest test\", \"pytest\", or when a task or feature is completed and needs test coverage. Always use after any engineering task produces code. Integrated into Workflow: Phase 5 automatically."
---


# Unit Test Writer Skill

Write comprehensive, maintainable unit tests that cover happy paths, edge cases, error paths, and boundary conditions. Tests are the contract that proves code works.

---

## Testing Philosophy

```
A good unit test:
  ✅ Tests ONE thing (single assertion per concept)
  ✅ Is independent (no shared state between tests)
  ✅ Is deterministic (always same result)
  ✅ Is fast (< 100ms per test)
  ✅ Has a clear name that describes the scenario
  ✅ Follows AAA pattern: Arrange → Act → Assert
  ✅ Tests behavior, not implementation

A bad unit test:
  ❌ Tests multiple unrelated things in one it()
  ❌ Depends on test execution order
  ❌ Calls real external services (network, DB, filesystem)
  ❌ Has no assertion (only checks it doesn't crash)
  ❌ Named "test1" or "should work"
```

---

## Coverage Requirements

```
Minimum by layer:
  Utility functions:     100% — no excuse
  Service layer:          90% — all business logic paths
  Controller layer:       85% — happy + error paths
  React components:       80% — render, interactions, states
  Database models:        75% — validations, associations
  
Coverage types to hit:
  Line coverage:        > 80%
  Branch coverage:      > 75% (if/else, ternary, switch)
  Function coverage:    > 90%
```

---

## Test Case Identification Framework

Before writing tests, enumerate ALL scenarios:

```
For any function f(input) → output:

1. HAPPY PATH
   - Typical valid input → expected output
   - Different valid input variations

2. BOUNDARY CONDITIONS
   - Minimum valid value (empty string, 0, [])
   - Maximum valid value
   - Exact boundary (length === limit)
   - Off-by-one (length === limit - 1, limit + 1)

3. INVALID INPUT
   - null / undefined
   - Wrong type (string when number expected)
   - Empty collection
   - Malformed data

4. ERROR PATHS
   - Dependency throws exception
   - Async operation rejects
   - Timeout scenarios

5. STATE VARIATIONS
   - First call vs subsequent calls
   - Authenticated vs unauthenticated user
   - Different user roles/permissions

6. SIDE EFFECTS
   - Was the DB called with right args?
   - Was the event emitted?
   - Was the cache cleared?
```

---

## JavaScript / TypeScript (Jest)

### Service Unit Test

```javascript
// services/__tests__/auth.service.test.js
const AuthService = require('../auth.service');
const UserRepository = require('../../repositories/user.repository');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Mock ALL dependencies — unit tests test one thing
jest.mock('../../repositories/user.repository');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Clean state between tests
  });

  describe('login()', () => {
    const validCredentials = { email: 'user@test.com', password: 'ValidPass123!' };
    const mockUser = {
      id: 'uuid-123',
      email: 'user@test.com',
      passwordHash: '$2b$12$hashedpassword',
      isActive: true,
    };

    // ─── Happy Path ────────────────────────────────────────────
    it('returns access token and refresh token on valid credentials', async () => {
      UserRepository.findByEmail.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign
        .mockReturnValueOnce('access-token-xyz')
        .mockReturnValueOnce('refresh-token-xyz');

      const result = await AuthService.login(validCredentials);

      expect(result).toEqual({
        accessToken: 'access-token-xyz',
        refreshToken: 'refresh-token-xyz',
        user: { id: 'uuid-123', email: 'user@test.com' },
      });
    });

    it('calls findByEmail with lowercased email', async () => {
      UserRepository.findByEmail.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('token');

      await AuthService.login({ email: 'USER@TEST.COM', password: 'pass' });

      expect(UserRepository.findByEmail).toHaveBeenCalledWith('user@test.com');
    });

    // ─── Error Paths ───────────────────────────────────────────
    it('throws AuthError when user not found', async () => {
      UserRepository.findByEmail.mockResolvedValue(null);

      await expect(AuthService.login(validCredentials))
        .rejects.toThrow('Invalid email or password');
    });

    it('throws AuthError when password is wrong', async () => {
      UserRepository.findByEmail.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      await expect(AuthService.login(validCredentials))
        .rejects.toThrow('Invalid email or password');
    });

    it('throws AccountDisabledError when user is inactive', async () => {
      UserRepository.findByEmail.mockResolvedValue({ ...mockUser, isActive: false });
      bcrypt.compare.mockResolvedValue(true);

      await expect(AuthService.login(validCredentials))
        .rejects.toThrow('Account is disabled');
    });

    // ─── Security ──────────────────────────────────────────────
    it('does not reveal whether email exists (same error message)', async () => {
      UserRepository.findByEmail.mockResolvedValue(null);
      const errorWhenNotFound = await AuthService.login(validCredentials)
        .catch(e => e.message);

      UserRepository.findByEmail.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);
      const errorWhenWrongPass = await AuthService.login(validCredentials)
        .catch(e => e.message);

      expect(errorWhenNotFound).toBe(errorWhenWrongPass);
    });

    // ─── Side Effects ──────────────────────────────────────────
    it('updates lastLoginAt after successful login', async () => {
      UserRepository.findByEmail.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('token');

      await AuthService.login(validCredentials);

      expect(UserRepository.updateLastLogin).toHaveBeenCalledWith('uuid-123', expect.any(Date));
    });

    // ─── Infrastructure ────────────────────────────────────────
    it('propagates database errors', async () => {
      UserRepository.findByEmail.mockRejectedValue(new Error('DB connection lost'));

      await expect(AuthService.login(validCredentials))
        .rejects.toThrow('DB connection lost');
    });
  });

  describe('validateToken()', () => {
    it('returns decoded payload for valid token', () => {
      jwt.verify.mockReturnValue({ userId: 'uuid-123', iat: 1234, exp: 9999 });

      const result = AuthService.validateToken('valid.jwt.token');

      expect(result).toEqual({ userId: 'uuid-123', iat: 1234, exp: 9999 });
    });

    it('throws for expired token', () => {
      jwt.verify.mockImplementation(() => { throw new jwt.TokenExpiredError('jwt expired'); });

      expect(() => AuthService.validateToken('expired.token'))
        .toThrow('Token expired');
    });

    it('throws for malformed token', () => {
      jwt.verify.mockImplementation(() => { throw new jwt.JsonWebTokenError('invalid'); });

      expect(() => AuthService.validateToken('bad-token'))
        .toThrow('Invalid token');
    });
  });
});
```

### Utility Function Tests

```javascript
// utils/__tests__/validators.test.js
const { validateEmail, validatePassword, sanitizeInput } = require('../validators');

describe('validateEmail()', () => {
  // Happy path
  it.each([
    'user@example.com',
    'user.name+tag@sub.domain.co.uk',
    'USER@EXAMPLE.COM',
  ])('accepts valid email: %s', (email) => {
    expect(validateEmail(email)).toBe(true);
  });

  // Invalid
  it.each([
    ['missing @', 'userexample.com'],
    ['missing domain', 'user@'],
    ['missing TLD', 'user@domain'],
    ['spaces', 'user @example.com'],
    ['empty string', ''],
  ])('rejects invalid email (%s): %s', (_, email) => {
    expect(validateEmail(email)).toBe(false);
  });

  // Boundaries
  it('rejects null and undefined', () => {
    expect(validateEmail(null)).toBe(false);
    expect(validateEmail(undefined)).toBe(false);
  });
});

describe('validatePassword()', () => {
  it('accepts password meeting all requirements', () => {
    expect(validatePassword('SecurePass123!')).toEqual({ valid: true, errors: [] });
  });

  it('rejects password shorter than 12 characters', () => {
    const result = validatePassword('Short1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('minimum 12 characters');
  });

  it('reports multiple failures at once', () => {
    const result = validatePassword('short');
    expect(result.errors.length).toBeGreaterThan(1);
  });
});
```

### React Component Tests

```jsx
// components/__tests__/LoginForm.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from '../LoginForm';

describe('LoginForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  // ─── Render ────────────────────────────────────────────────
  it('renders email, password fields and submit button', () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  // ─── Validation ────────────────────────────────────────────
  it('shows email validation error when submitted empty', async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('shows error for invalid email format', async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    await userEvent.type(screen.getByLabelText(/email/i), 'notanemail');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
  });

  // ─── Interaction ───────────────────────────────────────────
  it('calls onSubmit with form values on valid submission', async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    await userEvent.type(screen.getByLabelText(/email/i), 'user@test.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'SecurePass123!');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'user@test.com',
        password: 'SecurePass123!',
      });
    });
  });

  // ─── Loading State ─────────────────────────────────────────
  it('disables submit button and shows loading while submitting', async () => {
    const slowSubmit = jest.fn(() => new Promise(r => setTimeout(r, 100)));
    render(<LoginForm onSubmit={slowSubmit} />);

    await userEvent.type(screen.getByLabelText(/email/i), 'user@test.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'pass');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText(/signing in/i)).toBeInTheDocument();
  });

  // ─── Accessibility ─────────────────────────────────────────
  it('moves focus to email field on mount', () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);
    expect(screen.getByLabelText(/email/i)).toHaveFocus();
  });
});
```

---

## Python (pytest)

```python
# tests/unit/test_auth_service.py
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
from services.auth_service import AuthService
from exceptions import AuthError, AccountDisabledError

@pytest.fixture
def auth_service():
    user_repo = Mock()
    token_service = Mock()
    return AuthService(user_repo=user_repo, token_service=token_service)

@pytest.fixture
def mock_user():
    return Mock(
        id="uuid-123",
        email="user@test.com",
        password_hash="$2b$12$hashedpassword",
        is_active=True,
    )

class TestLogin:
    def test_returns_tokens_on_valid_credentials(self, auth_service, mock_user):
        auth_service.user_repo.find_by_email.return_value = mock_user
        auth_service.token_service.create_tokens.return_value = {
            "access_token": "access-xyz",
            "refresh_token": "refresh-xyz",
        }

        with patch("bcrypt.checkpw", return_value=True):
            result = auth_service.login("user@test.com", "ValidPass123!")

        assert result["access_token"] == "access-xyz"
        assert result["refresh_token"] == "refresh-xyz"

    def test_raises_auth_error_when_user_not_found(self, auth_service):
        auth_service.user_repo.find_by_email.return_value = None

        with pytest.raises(AuthError, match="Invalid email or password"):
            auth_service.login("unknown@test.com", "password")

    def test_raises_auth_error_on_wrong_password(self, auth_service, mock_user):
        auth_service.user_repo.find_by_email.return_value = mock_user

        with patch("bcrypt.checkpw", return_value=False):
            with pytest.raises(AuthError, match="Invalid email or password"):
                auth_service.login("user@test.com", "wrongpassword")

    def test_raises_disabled_error_for_inactive_account(self, auth_service, mock_user):
        mock_user.is_active = False
        auth_service.user_repo.find_by_email.return_value = mock_user

        with patch("bcrypt.checkpw", return_value=True):
            with pytest.raises(AccountDisabledError):
                auth_service.login("user@test.com", "ValidPass123!")

    @pytest.mark.parametrize("email", [
        "USER@TEST.COM", "User@Test.Com", "user@test.com"
    ])
    def test_normalizes_email_to_lowercase(self, auth_service, mock_user, email):
        auth_service.user_repo.find_by_email.return_value = mock_user
        with patch("bcrypt.checkpw", return_value=True):
            auth_service.login(email, "pass")

        auth_service.user_repo.find_by_email.assert_called_with("user@test.com")
```

---

## Test Output Template

After writing tests, report:

```markdown
## Unit Test Report: [Module/Feature]

### Coverage Summary
| File | Lines | Branches | Functions | Statements |
|------|-------|----------|-----------|------------|
| auth.service.js | 94% | 88% | 100% | 93% |
| validators.js | 100% | 100% | 100% | 100% |

### Test Cases Written
| Test Suite | Cases | Happy | Error | Edge | Boundary |
|------------|-------|-------|-------|------|----------|
| AuthService.login | 9 | 2 | 4 | 2 | 1 |
| validateEmail | 8 | 3 | 3 | 2 | 0 |

### Uncovered Scenarios (needs follow-up)
- [ ] Rate limiting logic — needs integration test
- [ ] Token refresh expiry edge case

### Run Command
\`\`\`bash
jest services/__tests__/auth.service.test.js --coverage
\`\`\`
All [N] tests pass ✅
```

Save test files to: `output/tests/unit/`
