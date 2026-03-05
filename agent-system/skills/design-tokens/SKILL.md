---
name: "design-tokens"
description: "Use when establishing a design system's token layer: color palettes, spacing scales, typography, component tokens, or multi-brand theming. Triggers: \"design tokens\", \"design system\", \"token\", \"theme tokens\", \"color system\", \"spacing system\", \"typography scale\", \"brand theming\", \"CSS variables\", or when building the foundation for a component library."
---


# Design Tokens Skill

Define and govern the single source of truth for all visual decisions: colors, spacing, typography, elevation, animation — as tokens that flow to CSS, MUI themes, Sass variables, and design tools.

---

## Token Architecture (3 layers)

```
Layer 1: Primitive Tokens (raw values)
  → color.blue.500 = #3b82f6
  → space.4 = 16px
  → Never use in components directly

Layer 2: Semantic Tokens (meaning-based aliases)
  → color.interactive.primary = {color.blue.500}
  → color.text.muted = {color.neutral.500}
  → Used in component tokens and CSS

Layer 3: Component Tokens (component-specific)
  → button.primary.background = {color.interactive.primary}
  → input.border.focus = {color.interactive.primary}
  → Used only in that component
```

---

## Primitive Token Definitions

```json
// tokens/primitives.json
{
  "color": {
    "blue":    { "50":"#eff6ff","100":"#dbeafe","200":"#bfdbfe","300":"#93c5fd","400":"#60a5fa","500":"#3b82f6","600":"#2563eb","700":"#1d4ed8","800":"#1e40af","900":"#1e3a8a" },
    "purple":  { "50":"#f5f3ff","500":"#8b5cf6","600":"#7c3aed","700":"#6d28d9" },
    "green":   { "50":"#f0fdf4","500":"#22c55e","600":"#16a34a","700":"#15803d" },
    "red":     { "50":"#fef2f2","500":"#ef4444","600":"#dc2626","700":"#b91c1c" },
    "amber":   { "50":"#fffbeb","500":"#f59e0b","600":"#d97706","700":"#b45309" },
    "neutral": { "0":"#ffffff","50":"#f9fafb","100":"#f3f4f6","200":"#e5e7eb","300":"#d1d5db","400":"#9ca3af","500":"#6b7280","600":"#4b5563","700":"#374151","800":"#1f2937","900":"#111827","950":"#030712" }
  },
  "space": {
    "0":"0","1":"4px","2":"8px","3":"12px","4":"16px","5":"20px","6":"24px","8":"32px",
    "10":"40px","12":"48px","14":"56px","16":"64px","20":"80px","24":"96px"
  },
  "fontSize": {
    "xs":"12px","sm":"14px","base":"16px","lg":"18px","xl":"20px",
    "2xl":"24px","3xl":"30px","4xl":"36px","5xl":"48px","6xl":"60px"
  },
  "fontWeight": { "normal":400,"medium":500,"semibold":600,"bold":700 },
  "lineHeight": { "none":1,"tight":1.25,"snug":1.375,"normal":1.5,"relaxed":1.625,"loose":2 },
  "borderRadius": { "none":"0","sm":"4px","md":"8px","lg":"12px","xl":"16px","2xl":"24px","full":"9999px" },
  "shadow": {
    "sm":"0 1px 2px 0 rgb(0 0 0/0.05)",
    "md":"0 4px 6px -1px rgb(0 0 0/0.1),0 2px 4px -2px rgb(0 0 0/0.1)",
    "lg":"0 10px 15px -3px rgb(0 0 0/0.1),0 4px 6px -4px rgb(0 0 0/0.1)",
    "xl":"0 20px 25px -5px rgb(0 0 0/0.1),0 8px 10px -6px rgb(0 0 0/0.1)"
  },
  "duration": { "fast":"100ms","base":"200ms","slow":"300ms","slower":"500ms" },
  "easing": { "linear":"linear","ease":"ease","ease-in":"ease-in","ease-out":"ease-out","bounce":"cubic-bezier(0.34,1.56,0.64,1)" },
  "zIndex": { "base":0,"dropdown":1000,"sticky":1100,"overlay":1200,"modal":1300,"toast":1700 }
}
```

---

## Semantic Tokens

```json
// tokens/semantic.light.json — light mode
{
  "color": {
    "background": {
      "default":  "{color.neutral.50}",
      "paper":    "{color.neutral.0}",
      "subtle":   "{color.neutral.100}",
      "inverse":  "{color.neutral.900}"
    },
    "text": {
      "primary":   "{color.neutral.900}",
      "secondary": "{color.neutral.600}",
      "muted":     "{color.neutral.500}",
      "disabled":  "{color.neutral.400}",
      "inverse":   "{color.neutral.0}",
      "link":      "{color.blue.600}"
    },
    "border": {
      "default":  "{color.neutral.200}",
      "strong":   "{color.neutral.300}",
      "focus":    "{color.blue.500}"
    },
    "interactive": {
      "primary":         "{color.blue.600}",
      "primaryHover":    "{color.blue.700}",
      "primarySubtle":   "{color.blue.50}",
      "secondary":       "{color.neutral.700}",
      "danger":          "{color.red.600}",
      "dangerHover":     "{color.red.700}"
    },
    "feedback": {
      "success":  "{color.green.600}",
      "successBg":"{color.green.50}",
      "warning":  "{color.amber.600}",
      "warningBg":"{color.amber.50}",
      "error":    "{color.red.600}",
      "errorBg":  "{color.red.50}",
      "info":     "{color.blue.600}",
      "infoBg":   "{color.blue.50}"
    }
  }
}

// tokens/semantic.dark.json — dark mode overrides
{
  "color": {
    "background": {
      "default":  "#0f172a",
      "paper":    "#1e293b",
      "subtle":   "#334155"
    },
    "text": {
      "primary":   "#f1f5f9",
      "secondary": "#94a3b8",
      "muted":     "#64748b"
    },
    "border": {
      "default":  "#334155",
      "strong":   "#475569"
    }
  }
}
```

---

## Generate CSS Custom Properties

```javascript
// scripts/generate-tokens.js
const primitives = require('./tokens/primitives.json');
const light = require('./tokens/semantic.light.json');
const dark  = require('./tokens/semantic.dark.json');

function flatten(obj, prefix = '') {
  return Object.entries(obj).reduce((acc, [key, val]) => {
    const full = prefix ? `${prefix}-${key}` : key;
    if (typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(acc, flatten(val, full));
    } else {
      acc[full] = val;
    }
    return acc;
  }, {});
}

function resolveRef(value, tokens) {
  // Resolve {color.blue.500} style references
  const match = value?.toString().match(/^\{(.+)\}$/);
  if (!match) return value;
  const path = match[1].split('.');
  return path.reduce((obj, key) => obj?.[key], tokens);
}

function tokensToCSS(tokens, primitives, selector = ':root') {
  const flat = flatten(tokens);
  const vars = Object.entries(flat)
    .map(([key, val]) => `  --${key}: ${resolveRef(val, primitives)};`)
    .join('\n');
  return `${selector} {\n${vars}\n}`;
}

const css = `
${tokensToCSS(light, primitives, ':root')}
${tokensToCSS(dark, primitives, '[data-theme="dark"]')}
`;

require('fs').writeFileSync('src/styles/tokens.css', css);
console.log('✅ Tokens generated: src/styles/tokens.css');
```

---

## Component Tokens

```typescript
// tokens/components.ts — component-level tokens referencing semantic
export const componentTokens = {
  button: {
    primary: {
      bg:         'var(--color-interactive-primary)',
      bgHover:    'var(--color-interactive-primaryHover)',
      text:       'var(--color-text-inverse)',
      border:     'transparent',
    },
    secondary: {
      bg:         'transparent',
      bgHover:    'var(--color-interactive-primarySubtle)',
      text:       'var(--color-interactive-primary)',
      border:     'var(--color-interactive-primary)',
    },
    danger: {
      bg:         'var(--color-interactive-danger)',
      bgHover:    'var(--color-interactive-dangerHover)',
      text:       'var(--color-text-inverse)',
    },
  },
  input: {
    border:       'var(--color-border-default)',
    borderFocus:  'var(--color-border-focus)',
    bg:           'var(--color-background-paper)',
    placeholder:  'var(--color-text-muted)',
    label:        'var(--color-text-secondary)',
  },
  card: {
    bg:           'var(--color-background-paper)',
    border:       'var(--color-border-default)',
    shadow:       'var(--shadow-sm)',
  },
};
```

---

## Multi-Brand Theming

```json
// tokens/brands/brand-a.json
{
  "brand": {
    "primary":   "#2563eb",
    "secondary": "#7c3aed",
    "logo":      "/logo-a.svg",
    "fontFamily":"'Inter', sans-serif"
  }
}

// tokens/brands/brand-b.json
{
  "brand": {
    "primary":   "#0f766e",
    "secondary": "#d97706",
    "logo":      "/logo-b.svg",
    "fontFamily":"'DM Sans', sans-serif"
  }
}
```

```css
/* Apply brand at root based on config */
[data-brand="brand-a"] { --color-interactive-primary: #2563eb; }
[data-brand="brand-b"] { --color-interactive-primary: #0f766e; }
```

---

## Sync Tokens to MUI Theme

```typescript
// theme/fromTokens.ts — tokens drive MUI, not the other way around
import { createTheme } from '@mui/material/styles';

// Read computed CSS vars at runtime (or import JSON directly)
export function createMuiThemeFromTokens(mode: 'light' | 'dark') {
  return createTheme({
    palette: {
      mode,
      primary: { main: 'var(--color-interactive-primary)' },
      error:   { main: 'var(--color-feedback-error)' },
      background: {
        default: 'var(--color-background-default)',
        paper:   'var(--color-background-paper)',
      },
      text: {
        primary:   'var(--color-text-primary)',
        secondary: 'var(--color-text-secondary)',
      },
    },
  });
}
```

---

## Token Governance Rules

```
1. Never hardcode colors in components — always use semantic tokens
2. Primitive tokens: used ONLY in semantic token definitions
3. New color? → add to primitives first, then create semantic alias
4. Dark mode: override semantic tokens, never component tokens
5. Token name format: [category]-[variant]-[state]
   ✅ color-interactive-primary-hover
   ❌ blue-hover / button-bg-blue
6. Keep token count manageable:
   Colors: ~30-50 semantic tokens
   Spacing: use the scale (don't add one-off values)
7. Every token change → regenerate CSS → commit both
```

---

## Output Files

```
tokens/
  primitives.json
  semantic.light.json
  semantic.dark.json
  components.ts
  brands/brand-a.json
scripts/
  generate-tokens.js
src/styles/
  tokens.css          ← generated — do not edit manually
```
