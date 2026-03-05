---
name: "accessibility-tester"
description: "Use when auditing or testing UI for accessibility, WCAG compliance, screen reader support, keyboard navigation, or color contrast. Triggers: \"accessibility\", \"a11y\", \"WCAG\", \"screen reader\", \"keyboard nav\", \"color contrast\", \"aria\", \"accessible\", or as part of QA on any user-facing UI. Integrated in Workflow: Phase 6 for all frontend features."
---


# Accessibility Tester Skill

Audit and fix UI for WCAG 2.1 AA compliance, screen reader support, keyboard navigation, and inclusive design.

---

## WCAG 2.1 AA Checklist (Required for Every UI)

### Perceivable
- [ ] Images have meaningful `alt` text (or `alt=""` for decorative)
- [ ] Color is not the ONLY way to convey information
- [ ] Text contrast ratio ≥ 4.5:1 (normal), ≥ 3:1 (large text 18px+)
- [ ] UI components contrast ≥ 3:1 against background
- [ ] Video has captions, audio has transcripts
- [ ] No content flashes more than 3 times/second
- [ ] Page works at 200% zoom without horizontal scroll

### Operable
- [ ] All interactions work with keyboard only (no mouse required)
- [ ] Focus is always visible — `outline` never removed without replacement
- [ ] Focus order is logical (matches visual/reading order)
- [ ] Skip navigation link at top of page
- [ ] No keyboard traps (user can always navigate away)
- [ ] Modals trap focus inside and return on close
- [ ] Links and buttons have descriptive text (not "click here")
- [ ] Sufficient time for time-limited content (or no limits)

### Understandable
- [ ] `<html lang="en">` set correctly
- [ ] Form inputs have associated `<label>` elements
- [ ] Error messages identify the field AND how to fix it
- [ ] Required fields marked with `aria-required="true"` + visible indicator
- [ ] Consistent navigation order across pages
- [ ] No unexpected context changes on focus or input

### Robust
- [ ] Valid HTML (no duplicate IDs, properly nested)
- [ ] ARIA roles used correctly (don't override native semantics)
- [ ] Interactive elements have accessible names
- [ ] Status messages use `aria-live` regions
- [ ] Works with: Chrome+NVDA, Firefox+NVDA, Safari+VoiceOver

---

## Automated Accessibility Testing

### axe-core in Jest (component level)

```javascript
// tests/accessibility/axe.test.jsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
  it('LoginForm has no violations', async () => {
    const { container } = render(<LoginForm onSubmit={() => {}} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('UserCard has no violations', async () => {
    const { container } = render(
      <UserCard user={{ id: '1', name: 'Alice', email: 'a@b.com' }} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('DataTable has no violations', async () => {
    const { container } = render(
      <DataTable columns={columns} data={mockData} />
    );
    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true },
        'table-duplicate-name': { enabled: true },
      }
    });
    expect(results).toHaveNoViolations();
  });
});
```

### Playwright accessibility audit (page level)

```javascript
// tests/e2e/accessibility.spec.js
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Page accessibility', () => {
  test('Login page: no critical violations', async ({ page }) => {
    await page.goto('/login');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    // Report all violations
    if (results.violations.length > 0) {
      console.table(results.violations.map(v => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.length,
      })));
    }

    // Fail on critical/serious only (triage approach)
    const blocking = results.violations.filter(
      v => ['critical', 'serious'].includes(v.impact)
    );
    expect(blocking).toHaveLength(0);
  });

  test('Keyboard navigation: full flow', async ({ page }) => {
    await page.goto('/login');
    
    // Tab through all interactive elements
    await page.keyboard.press('Tab'); // email field
    await expect(page.locator(':focus')).toHaveAttribute('type', 'email');
    
    await page.keyboard.press('Tab'); // password field
    await expect(page.locator(':focus')).toHaveAttribute('type', 'password');
    
    await page.keyboard.press('Tab'); // submit button
    await expect(page.locator(':focus')).toHaveRole('button');
    
    // Submit with Enter
    await page.keyboard.press('Enter');
  });
});
```

---

## Common Fixes

### Missing accessible names

```jsx
// ❌ Icon button with no label
<button onClick={onDelete}>
  <TrashIcon />
</button>

// ✅ With aria-label
<button onClick={onDelete} aria-label="Delete item">
  <TrashIcon aria-hidden="true" />
</button>

// ❌ Input with no label
<input type="email" placeholder="Email" />

// ✅ With associated label
<label htmlFor="email">Email address</label>
<input id="email" type="email" placeholder="you@example.com" />
```

### Missing focus styles

```css
/* ❌ Never do this */
*:focus { outline: none; }

/* ✅ Replace with visible style */
*:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
  border-radius: 4px;
}
```

### Error message association

```jsx
// ❌ Error not linked to field
<input type="email" />
{error && <p className="text-red-600">{error}</p>}

// ✅ Linked via aria-describedby
<input
  type="email"
  aria-describedby={error ? 'email-error' : undefined}
  aria-invalid={!!error}
/>
{error && (
  <p id="email-error" role="alert" className="text-red-600">
    {error}
  </p>
)}
```

### Modal focus trap

```jsx
function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    
    // Save previous focus
    const previousFocus = document.activeElement;
    
    // Focus first focusable element in modal
    const focusable = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable[0]?.focus();

    // Trap focus inside modal
    const handleTab = (e) => {
      if (e.key !== 'Tab') return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => {
      document.removeEventListener('keydown', handleTab);
      previousFocus?.focus(); // Restore focus on close
    };
  }, [isOpen]);

  return isOpen ? (
    <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      {children}
    </div>
  ) : null;
}
```

### Live regions for dynamic content

```jsx
// Status messages (non-urgent)
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {statusMessage}
</div>

// Error messages (urgent)
<div aria-live="assertive" role="alert">
  {errorMessage}
</div>

// Loading state
<div aria-live="polite">
  {isLoading ? 'Loading users...' : `${users.length} users loaded`}
</div>
```

---

## Accessibility Audit Report

```markdown
# Accessibility Audit Report

Date: [date]
Pages tested: [list]
Standard: WCAG 2.1 AA
Tools: axe-core, Playwright, manual testing

## Summary

| Severity | Count | Blocking |
|----------|-------|---------|
| Critical | 0 | Yes |
| Serious | 2 | Yes |
| Moderate | 4 | No |
| Minor | 7 | No |

## Violations (Blocking — fix before release)

### [violation-id]: [description]
Impact: Critical / Serious
WCAG: [criterion, e.g. 1.1.1]
Affects: [component or page]
Fix: [specific code change]
Example:
  ❌ [bad code]
  ✅ [good code]

## Manual Test Results

| Test | Chrome+NVDA | Safari+VoiceOver | Keyboard Only |
|------|-------------|-----------------|---------------|
| Login flow | ✅ | ✅ | ✅ |
| Form errors | ✅ | ⚠️ delay | ✅ |
| Modal | ✅ | ✅ | ✅ |
| Data table | ✅ | ✅ | ⚠️ no row nav |

## Verdict

✅ Meets WCAG 2.1 AA (0 critical/serious violations)
OR
❌ Does not meet standard — fix [N] serious violations first
```
