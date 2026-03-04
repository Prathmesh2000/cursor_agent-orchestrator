---
name: sass-styling
description: Use when writing Sass/SCSS stylesheets, establishing CSS architecture, implementing BEM methodology, creating mixins/functions, managing design tokens in Sass, or setting up a scalable styling system. Triggers: "Sass", "SCSS", "BEM", "CSS architecture", "mixins", "Sass variables", "CSS modules with Sass", "style system", "sass partials", or any project where Sass is the styling approach.
---

# Sass Styling Skill

Design and implement scalable Sass/SCSS architectures: 7-1 pattern, BEM methodology, design tokens, mixins library, responsive utilities, and CSS Modules integration.

---

## Architecture: 7-1 Pattern

```
styles/
├── abstracts/          ← no CSS output — only tools
│   ├── _variables.scss  → design tokens: colors, spacing, typography
│   ├── _functions.scss  → pure Sass functions
│   ├── _mixins.scss     → reusable patterns
│   └── _placeholders.scss → %extend targets
│
├── base/               ← reset + defaults
│   ├── _reset.scss      → box-sizing, margins, normalize
│   ├── _typography.scss → body, headings, text defaults
│   └── _animations.scss → keyframe definitions
│
├── components/         ← one file per component
│   ├── _button.scss
│   ├── _card.scss
│   ├── _form.scss
│   ├── _modal.scss
│   └── _table.scss
│
├── layout/             ← structural layout
│   ├── _grid.scss
│   ├── _header.scss
│   ├── _sidebar.scss
│   └── _footer.scss
│
├── pages/              ← page-specific overrides
│   ├── _dashboard.scss
│   └── _auth.scss
│
├── themes/             ← color scheme variants
│   ├── _light.scss
│   └── _dark.scss
│
├── vendors/            ← third-party overrides
│   └── _mui-overrides.scss
│
└── main.scss           ← imports everything in order
```

```scss
// styles/main.scss — import order matters
@use 'abstracts/variables' as *;
@use 'abstracts/functions' as *;
@use 'abstracts/mixins' as *;
@use 'abstracts/placeholders';

@use 'base/reset';
@use 'base/typography';
@use 'base/animations';

@use 'layout/grid';
@use 'layout/header';
@use 'layout/sidebar';

@use 'components/button';
@use 'components/card';
@use 'components/form';
@use 'components/modal';
@use 'components/table';

@use 'pages/dashboard';
@use 'pages/auth';

@use 'themes/light';
@use 'themes/dark';

@use 'vendors/mui-overrides';
```

---

## Design Tokens in Sass

```scss
// abstracts/_variables.scss
@use 'sass:math';
@use 'sass:color';
@use 'sass:map';

// ─── Color palette ────────────────────────────────────────────────
$color-primary-50:   #eff6ff;
$color-primary-100:  #dbeafe;
$color-primary-500:  #3b82f6;
$color-primary-600:  #2563eb;  // ← main brand color
$color-primary-700:  #1d4ed8;
$color-primary-900:  #1e3a8a;

$color-neutral-50:   #f9fafb;
$color-neutral-100:  #f3f4f6;
$color-neutral-200:  #e5e7eb;
$color-neutral-500:  #6b7280;
$color-neutral-700:  #374151;
$color-neutral-900:  #111827;

$color-success-main: #16a34a;
$color-warning-main: #d97706;
$color-error-main:   #dc2626;

// ─── Semantic aliases (use these in components, not raw colors) ───
$color-bg-default:   $color-neutral-50;
$color-bg-paper:     #ffffff;
$color-text-primary: $color-neutral-900;
$color-text-muted:   $color-neutral-500;
$color-border:       $color-neutral-200;
$color-border-hover: $color-neutral-300;

// ─── Spacing scale (4px base) ─────────────────────────────────────
$space-1:  4px;
$space-2:  8px;
$space-3:  12px;
$space-4:  16px;
$space-5:  20px;
$space-6:  24px;
$space-8:  32px;
$space-10: 40px;
$space-12: 48px;
$space-16: 64px;

// ─── Typography ───────────────────────────────────────────────────
$font-family-base:  'Inter', system-ui, -apple-system, sans-serif;
$font-family-mono:  'JetBrains Mono', 'Fira Code', monospace;

$font-size-xs:   0.75rem;   // 12px
$font-size-sm:   0.875rem;  // 14px
$font-size-base: 1rem;      // 16px
$font-size-lg:   1.125rem;  // 18px
$font-size-xl:   1.25rem;   // 20px
$font-size-2xl:  1.5rem;    // 24px
$font-size-3xl:  1.875rem;  // 30px
$font-size-4xl:  2.25rem;   // 36px

$font-weight-normal:   400;
$font-weight-medium:   500;
$font-weight-semibold: 600;
$font-weight-bold:     700;

$line-height-tight:  1.25;
$line-height-normal: 1.5;
$line-height-loose:  1.75;

// ─── Border radius ────────────────────────────────────────────────
$radius-sm:   4px;
$radius-md:   8px;
$radius-lg:   12px;
$radius-xl:   16px;
$radius-full: 9999px;

// ─── Shadows ──────────────────────────────────────────────────────
$shadow-sm:  0 1px 2px 0 rgb(0 0 0 / 0.05);
$shadow-md:  0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
$shadow-lg:  0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
$shadow-xl:  0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);

// ─── Transitions ──────────────────────────────────────────────────
$transition-fast:   150ms ease;
$transition-base:   200ms ease;
$transition-slow:   300ms ease;
$transition-bounce: 300ms cubic-bezier(0.34, 1.56, 0.64, 1);

// ─── Z-index scale ────────────────────────────────────────────────
$z-dropdown:  1000;
$z-sticky:    1100;
$z-modal:     1300;
$z-tooltip:   1500;
$z-toast:     1700;

// ─── Breakpoints ──────────────────────────────────────────────────
$breakpoints: (
  'xs': 0,
  'sm': 600px,
  'md': 960px,
  'lg': 1280px,
  'xl': 1920px,
);
```

---

## Mixins Library

```scss
// abstracts/_mixins.scss
@use 'sass:map';
@use 'variables' as v;

// ─── Responsive ───────────────────────────────────────────────────
@mixin respond-to($breakpoint) {
  $bp: map.get(v.$breakpoints, $breakpoint);
  @if $bp == null { @error "Unknown breakpoint: #{$breakpoint}"; }
  @if $bp == 0    { @content; }
  @else           { @media (min-width: $bp) { @content; } }
}

// ─── Typography ───────────────────────────────────────────────────
@mixin text-style($size, $weight: v.$font-weight-normal, $line-height: v.$line-height-normal) {
  font-size: $size;
  font-weight: $weight;
  line-height: $line-height;
}

@mixin truncate($lines: 1) {
  @if $lines == 1 {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  } @else {
    display: -webkit-box;
    -webkit-line-clamp: $lines;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

// ─── Layout ───────────────────────────────────────────────────────
@mixin flex($direction: row, $align: center, $justify: flex-start, $gap: 0) {
  display: flex;
  flex-direction: $direction;
  align-items: $align;
  justify-content: $justify;
  @if $gap != 0 { gap: $gap; }
}

@mixin flex-center { display: flex; align-items: center; justify-content: center; }

@mixin grid($cols: 1, $gap: v.$space-4) {
  display: grid;
  grid-template-columns: repeat($cols, 1fr);
  gap: $gap;
}

@mixin absolute-fill { position: absolute; inset: 0; }
@mixin fixed-fill    { position: fixed;    inset: 0; }

// ─── Interactivity ────────────────────────────────────────────────
@mixin hover-lift($y: -2px, $shadow: v.$shadow-md) {
  transition: transform v.$transition-base, box-shadow v.$transition-base;
  &:hover { transform: translateY($y); box-shadow: $shadow; }
}

@mixin focus-ring($color: v.$color-primary-600, $offset: 2px) {
  &:focus-visible {
    outline: 2px solid $color;
    outline-offset: $offset;
    border-radius: v.$radius-sm;
  }
}

@mixin button-reset {
  appearance: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font: inherit;
  color: inherit;
  text-decoration: none;
}

// ─── Visuals ──────────────────────────────────────────────────────
@mixin card($padding: v.$space-6, $radius: v.$radius-lg) {
  background: v.$color-bg-paper;
  border: 1px solid v.$color-border;
  border-radius: $radius;
  padding: $padding;
  box-shadow: v.$shadow-sm;
}

@mixin scrollbar($width: 6px, $track: v.$color-neutral-100, $thumb: v.$color-neutral-300) {
  &::-webkit-scrollbar         { width: $width; height: $width; }
  &::-webkit-scrollbar-track   { background: $track; border-radius: v.$radius-full; }
  &::-webkit-scrollbar-thumb   { background: $thumb; border-radius: v.$radius-full;
                                  &:hover { background: darken($thumb, 10%); } }
}

@mixin skeleton-loading {
  background: linear-gradient(
    90deg, v.$color-neutral-100 25%, v.$color-neutral-200 50%, v.$color-neutral-100 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
}

// ─── Keyframes (put in base/_animations.scss) ─────────────────────
// @keyframes skeleton-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
```

---

## BEM Methodology

```scss
// Block__Element--Modifier pattern
// components/_card.scss
@use '../abstracts/variables' as v;
@use '../abstracts/mixins' as m;

.card {                               // Block
  @include m.card;
  transition: border-color v.$transition-base, box-shadow v.$transition-base;

  &:hover {
    border-color: v.$color-border-hover;
    box-shadow: v.$shadow-md;
  }

  // Elements
  &__header {
    @include m.flex(row, center, space-between);
    padding-bottom: v.$space-4;
    border-bottom: 1px solid v.$color-border;
    margin-bottom: v.$space-4;
  }

  &__title {
    @include m.text-style(v.$font-size-lg, v.$font-weight-semibold, v.$line-height-tight);
    color: v.$color-text-primary;
    @include m.truncate(2);
  }

  &__body { flex: 1; }

  &__footer {
    @include m.flex(row, center, flex-end, v.$space-2);
    padding-top: v.$space-4;
    border-top: 1px solid v.$color-border;
    margin-top: v.$space-4;
  }

  // Modifiers
  &--elevated {
    border: none;
    box-shadow: v.$shadow-lg;
    &:hover { box-shadow: v.$shadow-xl; }
  }

  &--interactive {
    cursor: pointer;
    @include m.hover-lift;
    @include m.focus-ring;
  }

  &--loading {
    .card__title,
    .card__body {
      @include m.skeleton-loading;
      border-radius: v.$radius-sm;
      color: transparent;
    }
  }

  // Responsive
  @include m.respond-to('md') {
    &--horizontal {
      @include m.flex(row, flex-start);
      .card__image { width: 200px; flex-shrink: 0; }
    }
  }
}
```

---

## CSS Modules + Sass (React)

```scss
// components/Button/Button.module.scss
@use '../../styles/abstracts/variables' as v;
@use '../../styles/abstracts/mixins' as m;

.button {
  @include m.button-reset;
  @include m.flex-center;
  @include m.focus-ring;
  gap: v.$space-2;
  padding: v.$space-2 v.$space-4;
  border-radius: v.$radius-md;
  font-size: v.$font-size-sm;
  font-weight: v.$font-weight-medium;
  transition: background-color v.$transition-fast, transform v.$transition-fast;
  cursor: pointer;

  &:active { transform: scale(0.98); }
  &:disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }

  // Variants
  &--primary {
    background: v.$color-primary-600;
    color: #fff;
    &:hover { background: v.$color-primary-700; }
  }

  &--secondary {
    background: transparent;
    color: v.$color-primary-600;
    border: 1px solid v.$color-primary-600;
    &:hover { background: v.$color-primary-50; }
  }

  &--ghost {
    background: transparent;
    color: v.$color-text-primary;
    &:hover { background: v.$color-neutral-100; }
  }

  // Sizes
  &--sm { padding: v.$space-1 v.$space-3; font-size: v.$font-size-xs; }
  &--lg { padding: v.$space-3 v.$space-6; font-size: v.$font-size-base; }

  // Loading
  &--loading { pointer-events: none; }
  .spinner { animation: spin 0.8s linear infinite; }
}

@keyframes spin { to { transform: rotate(360deg); } }
```

```tsx
// components/Button/Button.tsx
import styles from './Button.module.scss';
import clsx from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

function Button({ variant = 'primary', size = 'md', loading, children, className, ...props }) {
  return (
    <button
      className={clsx(
        styles.button,
        styles[`button--${variant}`],
        size !== 'md' && styles[`button--${size}`],
        loading && styles['button--loading'],
        className,
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <span className={styles.spinner}>⟳</span>}
      {children}
    </button>
  );
}
```

---

## Dark Mode with CSS Custom Properties

```scss
// themes/_light.scss
:root {
  --color-bg:           #{v.$color-neutral-50};
  --color-bg-paper:     #ffffff;
  --color-text:         #{v.$color-neutral-900};
  --color-text-muted:   #{v.$color-neutral-500};
  --color-border:       #{v.$color-neutral-200};
  --color-primary:      #{v.$color-primary-600};
}

// themes/_dark.scss
[data-theme='dark'] {
  --color-bg:           #0f172a;
  --color-bg-paper:     #1e293b;
  --color-text:         #f1f5f9;
  --color-text-muted:   #94a3b8;
  --color-border:       #334155;
  --color-primary:      #{v.$color-primary-400};
}

// Now components use CSS vars instead of Sass vars:
.card {
  background: var(--color-bg-paper);
  border-color: var(--color-border);
  color: var(--color-text);
}
```

---

## Sass + MUI Coexistence Rules

```
Use Sass for:                    Use MUI sx/theme for:
─────────────────────────────    ─────────────────────────────
Custom components (no MUI base)  MUI component customization
Global CSS resets                Responsive MUI layouts
Animation keyframes              MUI breakpoints/Grid
Vendor overrides                 MUI color tokens (stay in sync)
CSS Modules scoped styles        MUI theme variants
```

---

## Output Files

```
src/
  styles/
    abstracts/     _variables.scss  _mixins.scss  _functions.scss
    base/          _reset.scss      _typography.scss
    components/    _button.scss     _card.scss     _form.scss
    layout/        _grid.scss       _header.scss
    themes/        _light.scss      _dark.scss
    main.scss
  components/
    Button/        Button.module.scss  Button.tsx
```
