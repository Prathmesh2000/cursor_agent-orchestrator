---
name: animation-motion
description: Use when adding animations, transitions, or motion to UI components. Triggers: "animation", "Framer Motion", "transition", "micro-interaction", "page transition", "hover animation", "loading animation", "motion", "animate", "spring", or when UI needs to feel more polished and alive.
---

# Animation & Motion Skill

Implement purposeful, performant UI animations with Framer Motion and CSS transitions. Motion should communicate state changes, guide attention, and add delight — never distraction.

---

## Animation Principles

```
1. Motion serves purpose — every animation explains something
2. Fast > slow — most UI transitions: 150–300ms
3. Ease out for things appearing, ease in for disappearing
4. Never block content — animate after data loads
5. Respect prefers-reduced-motion — always provide fallback
6. GPU-friendly properties: transform + opacity ONLY (avoid width/height/top/left)
```

---

## CSS Transitions (simple states)

```scss
// Use for: hover states, toggles, color changes — no JS needed

// Base transition utilities
.transition-fast   { transition: all 150ms ease; }
.transition-base   { transition: all 200ms ease; }
.transition-slow   { transition: all 300ms ease; }
.transition-bounce { transition: all 300ms cubic-bezier(0.34, 1.56, 0.64, 1); }

// Card hover lift
.card-interactive {
  transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgb(0 0 0 / 0.12);
  }
  &:active { transform: translateY(0); }
}

// Button press feedback
.button {
  transition: background-color 150ms ease, transform 100ms ease;
  &:active { transform: scale(0.97); }
}

// Smooth expand (use max-height trick for height: auto)
.collapsible {
  max-height: 0;
  overflow: hidden;
  transition: max-height 300ms ease;
  &.open { max-height: 500px; } // must be > actual height
}

// Skeleton shimmer
@keyframes shimmer {
  from { background-position: 200% center; }
  to   { background-position: -200% center; }
}
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}
```

---

## Framer Motion Setup

```bash
npm install framer-motion
```

```typescript
// lib/motion.ts — shared animation variants (single source of truth)
import { Variants, Transition } from 'framer-motion';

// ─── Transitions ──────────────────────────────────────────────────
export const spring: Transition = { type: 'spring', damping: 25, stiffness: 350 };
export const springBouncy: Transition = { type: 'spring', damping: 15, stiffness: 400 };
export const tween: (dur?: number) => Transition = (duration = 0.2) => ({
  type: 'tween', duration, ease: 'easeOut',
});

// ─── Variants ─────────────────────────────────────────────────────
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: tween(0.2) },
  exit:    { opacity: 0, transition: tween(0.15) },
};

export const slideUp: Variants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: tween(0.25) },
  exit:    { opacity: 0, y: 8, transition: tween(0.15) },
};

export const slideInRight: Variants = {
  hidden:  { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: spring },
  exit:    { opacity: 0, x: 24, transition: tween(0.2) },
};

export const scaleIn: Variants = {
  hidden:  { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: springBouncy },
  exit:    { opacity: 0, scale: 0.95, transition: tween(0.15) },
};

// ─── List stagger ─────────────────────────────────────────────────
export const staggerContainer: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};

export const staggerItem: Variants = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: spring },
};
```

---

## Common Animation Patterns

### Page transitions

```typescript
// components/PageTransition.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { slideUp } from '../lib/motion';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={slideUp}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

### Modal / Dialog

```typescript
// Overlay fades, panel slides up
const overlayVariants: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
};
const panelVariants: Variants = {
  hidden:  { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: springBouncy },
  exit:    { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.15 } },
};

function AnimatedModal({ isOpen, onClose, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-modal" variants={overlayVariants} initial="hidden" animate="visible" exit="hidden">
          <div className="overlay" onClick={onClose} />
          <motion.div className="modal-panel" variants={panelVariants}>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### Animated list (add/remove items)

```typescript
function AnimatedList({ items }: { items: Item[] }) {
  return (
    <motion.ul variants={staggerContainer} initial="hidden" animate="visible">
      <AnimatePresence mode="popLayout">
        {items.map(item => (
          <motion.li
            key={item.id}
            variants={staggerItem}
            exit={{ opacity: 0, x: -20, height: 0, transition: { duration: 0.2 } }}
            layout  // smooth reorder when items removed
          >
            <ItemCard item={item} />
          </motion.li>
        ))}
      </AnimatePresence>
    </motion.ul>
  );
}
```

### Drag and drop with layout animations

```typescript
function DraggableCard({ id, children }) {
  return (
    <Reorder.Item
      value={id}
      id={id}
      whileDrag={{ scale: 1.03, boxShadow: '0 20px 40px rgb(0 0 0 / 0.15)', cursor: 'grabbing' }}
      transition={spring}
    >
      {children}
    </Reorder.Item>
  );
}
```

### Notification toast enter/exit

```typescript
function Toast({ message, type, onClose }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.15 } }}
      transition={spring}
      className={`toast toast--${type}`}
    >
      {message}
    </motion.div>
  );
}
```

---

## Reduced Motion (accessibility)

```typescript
// Always respect OS setting
import { useReducedMotion } from 'framer-motion';

function AnimatedComponent() {
  const prefersReduced = useReducedMotion();

  const variants = prefersReduced ? {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  } : slideUp; // full animation for users who want it

  return <motion.div variants={variants} initial="hidden" animate="visible" />;
}

// Or in CSS:
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Performance Rules

```
✅ Animate only: transform (translate, scale, rotate) + opacity
✅ Use will-change: transform on elements you know will animate
✅ Use framer-motion layout prop for smooth reorders
✅ Lazy import heavy animations (not in critical path)

❌ Never animate: width, height, top, left, margin, padding
❌ Never animate too many elements simultaneously (> 20)
❌ Don't use JS animations for hover states — use CSS
❌ Don't block content loading with entrance animations
```
