---
name: "storybook-writer"
description: "Use when writing Storybook stories, component documentation, visual testing, or setting up a component library documentation site. Triggers: \"Storybook\", \"stories\", \"component docs\", \"visual testing\", \"CSF\", \"component library docs\", \"interaction tests\", \"chromatic\", or when components need isolated documentation and visual regression testing."
---


# Storybook Writer Skill

Write comprehensive, production-grade Storybook stories: Component Story Format (CSF3), interaction tests, accessibility checks, and visual regression setup.

---

## Setup (Storybook 8 + React + Vite)

```bash
npx storybook@latest init
# Adds: .storybook/main.ts, .storybook/preview.ts, src/**/*.stories.tsx
```

```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx|mdx)'],
  addons: [
    '@storybook/addon-essentials',       // controls, actions, docs, viewport
    '@storybook/addon-a11y',             // accessibility audit
    '@storybook/addon-interactions',     // play() function testing
    '@chromatic-com/storybook',          // visual regression
  ],
  framework: { name: '@storybook/react-vite', options: {} },
};
export default config;
```

```typescript
// .storybook/preview.ts
import type { Preview } from '@storybook/react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from '../src/theme/theme';
import '../src/styles/main.scss';

const preview: Preview = {
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div style={{ padding: '24px' }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  parameters: {
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#f9fafb' },
        { name: 'dark',  value: '#0f172a' },
        { name: 'white', value: '#ffffff' },
      ],
    },
    viewport: { viewports: INITIAL_VIEWPORTS },  // responsive testing
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/ } },
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: true }] } },
  },
};
export default preview;
```

---

## Story Template (CSF3)

```typescript
// components/Button/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { fn, userEvent, within, expect } from '@storybook/test';
import { Button } from './Button';

// ─── Meta ─────────────────────────────────────────────────────────
const meta: Meta<typeof Button> = {
  title: 'Components/Button',   // path in sidebar: Components > Button
  component: Button,
  tags: ['autodocs'],           // auto-generate docs page
  argTypes: {
    variant: {
      control: 'select',
      options: ['contained', 'outlined', 'text', 'soft'],
      description: 'Visual style variant',
      table: { defaultValue: { summary: 'contained' } },
    },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'error', 'warning', 'success'],
    },
    size: { control: 'radio', options: ['small', 'medium', 'large'] },
    disabled:  { control: 'boolean' },
    loading:   { control: 'boolean' },
    children:  { control: 'text' },
    onClick:   { action: 'clicked' },  // logs to Actions tab
  },
  args: {
    onClick: fn(),  // spy for interaction tests
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

// ─── Stories ──────────────────────────────────────────────────────
// Each export is a story
export const Primary: Story = {
  args: { children: 'Continue', variant: 'contained', color: 'primary' },
};

export const Secondary: Story = {
  args: { children: 'Cancel', variant: 'outlined' },
};

export const Danger: Story = {
  args: { children: 'Delete account', variant: 'contained', color: 'error' },
};

export const Loading: Story = {
  args: { children: 'Saving…', loading: true },
};

export const Disabled: Story = {
  args: { children: 'Unavailable', disabled: true },
};

// ─── Composition story ────────────────────────────────────────────
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
      <Button variant="contained">Contained</Button>
      <Button variant="outlined">Outlined</Button>
      <Button variant="text">Text</Button>
      <Button variant="soft">Soft</Button>
    </div>
  ),
};

// ─── Interaction test ─────────────────────────────────────────────
export const ClickInteraction: Story = {
  args: { children: 'Click me' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /click me/i });

    // Verify initial state
    await expect(button).toBeEnabled();
    await expect(button).toBeVisible();

    // Simulate click
    await userEvent.click(button);

    // Verify click was called
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};
```

---

## Form Component Stories

```typescript
// components/LoginForm/LoginForm.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { userEvent, within, expect, waitFor, fn } from '@storybook/test';
import { LoginForm } from './LoginForm';

const meta: Meta<typeof LoginForm> = {
  title: 'Forms/LoginForm',
  component: LoginForm,
  tags: ['autodocs'],
  args: { onSubmit: fn() },
};
export default meta;
type Story = StoryObj<typeof LoginForm>;

export const Default: Story = {};

export const WithError: Story = {
  args: { error: 'Invalid email or password' },
};

export const Loading: Story = {
  args: { isLoading: true },
};

// Test: valid submission flow
export const SuccessfulLogin: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText(/email/i), 'user@example.com');
    await userEvent.type(canvas.getByLabelText(/password/i), 'password123');
    await userEvent.click(canvas.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(args.onSubmit).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
      });
    });
  },
};

// Test: validation errors
export const ValidationErrors: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(canvas.getByText(/email is required/i)).toBeInTheDocument();
      expect(canvas.getByText(/password is required/i)).toBeInTheDocument();
    });
  },
};
```

---

## MDX Documentation Page

```mdx
// components/Button/Button.docs.mdx
import { Canvas, Controls, Meta, Story } from '@storybook/blocks';
import * as ButtonStories from './Button.stories';

<Meta of={ButtonStories} />

# Button

The `Button` component triggers actions or events. Always use descriptive text — never "Click here".

## When to use

- **Contained**: Primary action (one per section)
- **Outlined**: Secondary action alongside a contained button
- **Text**: Tertiary or destructive actions in lists
- **Soft**: Subtle actions that need less visual weight

## Interactive demo

<Canvas of={ButtonStories.Primary} />
<Controls of={ButtonStories.Primary} />

## All variants

<Canvas of={ButtonStories.AllVariants} />

## Accessibility

- Always has accessible text (via `children` or `aria-label`)
- Focus ring visible on keyboard navigation
- Disabled state announced to screen readers via `aria-disabled`
```

---

## Visual Regression with Chromatic

```yaml
# .github/workflows/chromatic.yml
name: Chromatic

on:
  push:
    branches: [main]
  pull_request:

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - name: Publish to Chromatic
        uses: chromaui/action@latest
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          onlyChanged: true         # only test changed stories
          exitZeroOnChanges: true   # don't fail PR — flag for review
```

---

## Story Quality Checklist

- [ ] Default story shows component in typical use
- [ ] All variants have their own story
- [ ] Loading and error states documented
- [ ] Disabled state documented
- [ ] At least one interaction test with play()
- [ ] `tags: ['autodocs']` for auto-docs
- [ ] ArgTypes include description and default values
- [ ] Accessibility checked via @storybook/addon-a11y
- [ ] Mobile viewport story for responsive components

## Output Files

```
src/
  components/[Name]/
    [Name].tsx
    [Name].stories.tsx   ← stories + interaction tests
    [Name].docs.mdx      ← narrative documentation (optional)
.storybook/
  main.ts
  preview.ts
```
