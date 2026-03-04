---
name: e2e-test-writer
description: Use when writing end-to-end tests that simulate real user journeys through the full stack — browser, UI, API, and database. Triggers: "E2E test", "Playwright", "Cypress", "end to end", "user journey test", "full flow test", or in Workflow: Phase 6 after all tasks complete. E2E tests are the final quality gate before PM sign-off.
---

# E2E Test Writer Skill

Write end-to-end tests that simulate complete user journeys through the real application. These tests run in a real browser against a real (test) environment and are the final proof the system works as a whole.

---

## E2E Test Principles

```
Scope:     Full user journey — browser clicks → UI → API → DB
Tool:      Playwright (preferred) or Cypress
Database:  Test database, seeded fresh per test suite  
Speed:     E2E tests are slow (5–30s each) — keep suite focused
Focus:     Critical paths only — not edge cases (that's unit/integration)
Stability: Never use sleep() — always wait for visible elements or network
```

---

## What to Test in E2E

```
✅ MUST cover:
  - Full authentication flow (register → login → logout)
  - Core user-facing feature happy path
  - Error recovery flows (what happens when API fails)
  - Permission boundaries (can't access other user's data)
  
⚠️ Avoid in E2E (test in unit/integration instead):
  - Every input validation error
  - Edge cases of business logic
  - Internal API structures
```

---

## Playwright Tests (JavaScript)

### Page Object Model (Maintainability Pattern)

```javascript
// tests/e2e/pages/LoginPage.js
class LoginPage {
  constructor(page) {
    this.page = page;
    // Define locators once — change here when UI changes
    this.emailInput = page.getByLabel('Email address');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: /sign in/i });
    this.errorMessage = page.getByRole('alert');
    this.forgotPasswordLink = page.getByText(/forgot.*password/i);
  }

  async goto() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  async login(email, password) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async getErrorText() {
    await this.errorMessage.waitFor({ state: 'visible' });
    return this.errorMessage.textContent();
  }
}

module.exports = { LoginPage };
```

```javascript
// tests/e2e/pages/DashboardPage.js
class DashboardPage {
  constructor(page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /dashboard/i });
    this.userMenu = page.getByTestId('user-menu');
    this.logoutButton = page.getByRole('menuitem', { name: /sign out/i });
  }

  async isLoaded() {
    await this.heading.waitFor({ state: 'visible', timeout: 5000 });
    return true;
  }

  async logout() {
    await this.userMenu.click();
    await this.logoutButton.click();
  }
}

module.exports = { DashboardPage };
```

### Full Journey Tests

```javascript
// tests/e2e/journeys/auth.journey.test.js
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { DashboardPage } = require('../pages/DashboardPage');
const { RegisterPage } = require('../pages/RegisterPage');
const { TestDatabase } = require('../helpers/db.helper');

test.describe('Authentication Journey', () => {
  let db;

  test.beforeAll(async () => {
    db = new TestDatabase();
    await db.connect();
    await db.seed(); // Creates test users
  });

  test.afterAll(async () => {
    await db.clean();
    await db.disconnect();
  });

  test('user can register a new account and reach dashboard', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    const dashboardPage = new DashboardPage(page);

    await registerPage.goto();
    await registerPage.register({
      name: 'New User',
      email: 'newuser@e2etest.com',
      password: 'SecurePass123!',
    });

    // Should redirect to dashboard after register
    await expect(page).toHaveURL('/dashboard');
    expect(await dashboardPage.isLoaded()).toBe(true);

    // User name visible in header
    await expect(page.getByText('New User')).toBeVisible();
  });

  test('registered user can log in and see their data', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.goto();
    await loginPage.login('testuser@example.com', 'TestPass123!');

    await expect(page).toHaveURL('/dashboard');
    expect(await dashboardPage.isLoaded()).toBe(true);
  });

  test('shows error message on wrong password — does not redirect', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login('testuser@example.com', 'WrongPassword!');

    // Stays on login page
    await expect(page).toHaveURL('/login');

    // Shows error (does not reveal if email exists)
    const error = await loginPage.getErrorText();
    expect(error).toMatch(/invalid email or password/i);
  });

  test('logged-in user can log out and cannot access protected pages', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    // Login
    await loginPage.goto();
    await loginPage.login('testuser@example.com', 'TestPass123!');
    await expect(page).toHaveURL('/dashboard');

    // Logout
    await dashboardPage.logout();
    await expect(page).toHaveURL('/login');

    // Try to access protected route directly
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login'); // Redirected back
  });

  test('redirects to originally requested page after login', async ({ page }) => {
    // Navigate directly to protected route (not logged in)
    await page.goto('/settings/profile');
    await expect(page).toHaveURL(/\/login\?redirect/);

    // Login
    const loginPage = new LoginPage(page);
    await loginPage.login('testuser@example.com', 'TestPass123!');

    // Should land on originally requested page
    await expect(page).toHaveURL('/settings/profile');
  });

  test('session persists across browser refresh', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login('testuser@example.com', 'TestPass123!');
    await expect(page).toHaveURL('/dashboard');

    // Hard refresh
    await page.reload();

    // Still logged in
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText(/dashboard/i)).toBeVisible();
  });
});
```

### API Error Recovery E2E

```javascript
// tests/e2e/journeys/error-recovery.journey.test.js
const { test, expect } = require('@playwright/test');

test.describe('Error Recovery Journeys', () => {
  test('shows retry option when API is temporarily unavailable', async ({ page }) => {
    // Intercept and fail the API call
    await page.route('**/api/projects', route => {
      route.fulfill({ status: 503, body: JSON.stringify({ error: 'Service unavailable' }) });
    });

    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="error-state"]');

    const errorText = await page.getByTestId('error-state').textContent();
    expect(errorText).toMatch(/couldn't load/i);

    // Retry button visible
    await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();
  });

  test('recovers when API becomes available again after retry', async ({ page }) => {
    let callCount = 0;

    await page.route('**/api/projects', route => {
      callCount++;
      if (callCount === 1) {
        route.fulfill({ status: 503, body: '{}' });
      } else {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ data: [{ id: '1', name: 'Project Alpha' }] }),
        });
      }
    });

    await page.goto('/dashboard');
    await page.getByRole('button', { name: /try again/i }).click();
    await expect(page.getByText('Project Alpha')).toBeVisible();
  });
});
```

---

## Playwright Configuration

```javascript
// playwright.config.js
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,          // 30s per test
  retries: process.env.CI ? 2 : 0, // Retry on CI flakiness
  workers: process.env.CI ? 1 : 2,
  
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox',  use: { browserName: 'firefox' } },
    { name: 'webkit',   use: { browserName: 'webkit' } }, // Safari
    {
      name: 'mobile-chrome',
      use: { browserName: 'chromium', ...devices['Pixel 5'] },
    },
  ],

  reporter: [
    ['html', { outputFolder: 'output/tests/e2e-report' }],
    ['json', { outputFile: 'output/tests/e2e-results.json' }],
  ],

  webServer: {
    command: 'npm run start:test',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## E2E Test Report Template

```markdown
## E2E Test Report — [Feature/Sprint]

Date: [date] | Environment: [staging/test]

### Journey Coverage
| User Journey | Browsers | Status | Duration |
|---|---|---|---|
| Register + first login | Chrome, FF, Safari | ✅ Pass | 12s |
| Login → dashboard | Chrome, FF, Safari | ✅ Pass | 8s |
| Wrong password error | Chrome | ✅ Pass | 5s |
| Logout + redirect | Chrome | ✅ Pass | 6s |
| Session persistence | Chrome | ✅ Pass | 9s |

### Failures
[None] OR [list with screenshot links]

### Flaky Tests
[None] OR [list with retry count + suspected cause]

### Coverage
- Happy paths:    [X/X] ✅
- Error recovery: [X/X] ✅
- Mobile:         [X/X] ✅
- Cross-browser:  Chrome ✅ | Firefox ✅ | Safari ✅

### Run Command
\`\`\`bash
npx playwright test --project=chromium
npx playwright show-report output/tests/e2e-report
\`\`\`

Overall: [N] tests, [N] pass, [N] fail
```

Save to: `output/tests/e2e/`
