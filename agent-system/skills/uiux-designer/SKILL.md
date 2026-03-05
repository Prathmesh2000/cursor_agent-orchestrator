---
name: "uiux-designer"
description: "Use for any UI/UX design work — new screens, redesigns, user flows, component specs, design gaps. Triggers: \"design\", \"mockup\", \"wireframe\", \"user flow\", \"UI spec\", \"screen\", \"page\", \"how should it look\", \"what does the UI look like\", \"design the\", \"UX for\", or any feature that has a user-facing interface. ALWAYS runs the interview protocol first — never design without asking questions."
---


# UI/UX Designer Skill

Design every screen, state, and interaction before a line of frontend code is written.
Ask questions until the picture is clear. Never guess what the user wants.

---

## The Core Rule

```
NEVER start designing without completing the Interview Protocol.
Every unanswered question becomes a wrong assumption in the code.

The interview has 3 rounds:
  Round 1 — Context (who, what, where, existing constraints)
  Round 2 — Depth (flows, edge cases, states, interactions)
  Round 3 — Confirmation (present back the design, get explicit approval)

Each round ends with: "Does this match your vision? What would you change?"
```

---

## Round 1 — Context Interview

Ask ALL of these before doing anything:

```
📋 UI/UX DESIGN — Context Questions

1. WHO is using this?
   → Primary user type (admin / end user / developer / both)
   → Technical level (beginner / intermediate / power user)
   → Device they'll mostly use (desktop / mobile / both equally)

2. WHAT does the user need to accomplish?
   → The 1-3 core tasks on this screen/feature
   → "What should the user be able to do that they can't do now?"

3. EXISTING CONTEXT:
   → Does your app have an existing design system / component library?
     (MUI / Tailwind / custom / none)
   → Can you share a screenshot or describe an existing screen I should match?
   → Brand colors? (or "I'll decide")
   → Any screens / apps the feel should be inspired by?

4. SCOPE:
   → Is this a new page, a modal/drawer, an inline section, or a new flow?
   → How many distinct screens/steps are involved?

5. CONSTRAINTS:
   → Any hard requirements? (must be accessible / must work offline / must fit in X space)
   → Anything you've already decided about the layout?
```

Wait for answers. Then move to Round 2.

---

## Round 2 — Depth Interview

Based on Round 1 answers, ask these:

```
📋 Round 2 — Digging Deeper

FLOWS:
  → Walk me through the happy path step by step
    "User arrives at [screen] and wants to [goal]. What do they do first? Then what?"
  → What are the 2-3 most common user mistakes or confusion points?
  → What happens after the user completes the main action? (next screen, toast, redirect?)

STATES (ask per screen):
  → What does this screen look like before any data loads? (loading state)
  → What if there's no data yet? (empty state — first-time user)
  → What if something goes wrong? (error state — which errors are possible?)
  → What does success look like? (confirmation, redirect, toast?)
  → Are there any permission/role differences? (admin sees X, user sees Y)

DATA:
  → What data is displayed on this screen? List every field.
  → Is any of this data editable inline, or edit-only in a separate form?
  → How much data can there be? (5 items? 5000 items? affects pagination/infinite scroll)

INTERACTIONS:
  → Are there bulk actions? (select multiple → do action)
  → Any drag-and-drop or reordering?
  → Any real-time updates? (live data that refreshes automatically)
  → Any inline editing vs. modal editing?

NAVIGATION:
  → How does the user get to this screen? (from where?)
  → How do they leave? (back button / breadcrumb / tab / auto-redirect?)
  → Is there a sidebar nav? Top nav? Both? Neither?
```

Wait for answers. Then present a summary and ask:
**"Before I spec the screens — let me confirm what I heard. [2-3 sentence summary]. Does that match your vision? Anything I got wrong or missed?"**

Then move to Round 3.

---

## Round 3 — Design Presentation + Confirmation

Present the design spec section by section. After EACH section, ask:
**"Does this match what you had in mind? Any changes before I continue?"**

Don't dump the entire design at once. Present it incrementally:

```
Step 1: Present the flow diagram → ask for confirmation
Step 2: Present screen 1 spec → ask for confirmation
Step 3: Present screen 2 spec → ask for confirmation
(repeat per screen)
Step 4: Present all states (loading/empty/error/success) → ask for confirmation
Step 5: Present component hierarchy → ask for confirmation
Step 6: Present design tokens (colors, spacing, type) → ask for confirmation
Final:  "Design complete — ready for implementation?"
```

---

## Design Spec Output (per screen)

```markdown
## Screen: [Name]
Route: /[path]
Trigger: [What user action or navigation brings them here]

---

### Purpose
[One sentence: what the user accomplishes on this screen]

---

### Layout — Desktop (1280px+)

```
┌─────────────────────────────────────────────────────────┐
│  HEADER: Logo | Nav links | User avatar + menu           │
├──────────────────────────┬──────────────────────────────┤
│  SIDEBAR (240px)         │  MAIN CONTENT (flex-1)       │
│  - Nav item (active)     │                              │
│  - Nav item              │  Page Title              [CTA]│
│  - Nav item              │  ─────────────────────────── │
│  - Nav item              │  [Filters row]               │
│                          │                              │
│                          │  ┌────────────────────────┐  │
│                          │  │  Data Table / Cards    │  │
│                          │  │  Row 1                 │  │
│                          │  │  Row 2                 │  │
│                          │  │  Row 3                 │  │
│                          │  └────────────────────────┘  │
│                          │  [Pagination]                │
└──────────────────────────┴──────────────────────────────┘
```

### Layout — Mobile (375px)

```
┌────────────────────────┐
│  [☰] Logo    [Avatar]  │  ← top bar, hamburger menu
├────────────────────────┤
│  Page Title        [+] │
│  ─────────────────────  │
│  [Search / Filter]     │
│  ┌──────────────────┐  │
│  │  Card 1          │  │
│  │  Card 2          │  │
│  │  Card 3          │  │
│  └──────────────────┘  │
│  [Load more]           │
├────────────────────────┤
│  [🏠] [📋] [➕] [👤]  │  ← bottom tab bar
└────────────────────────┘
```

---

### States

**Default (data loaded):**
[Describe what the screen looks like with normal data]

**Loading:**
- Page transition: full-page skeleton (not spinner)
- Skeleton matches layout: nav skeleton + content area skeletons
- Duration before showing: immediate (no delay)

**Empty (no data yet):**
- Center of content area
- Illustration: [describe or "abstract empty state"]
- Headline: "[Action-oriented heading]"
- Sub-copy: "[Explain why it's empty + what to do]"
- CTA button: "[Primary action label]"
- Example: "No projects yet — Create your first project to get started"

**Error:**
- Inline: toast notification bottom-right, 4s auto-dismiss
- Message: "[User-friendly description] — [Retry action]"
- Critical errors: full inline error card with retry button (not toast)
- Never: technical error messages or stack traces to users

**Success:**
- [After form submit: toast "Saved" + stay on page / redirect to X]
- [After delete: toast "Deleted" with "Undo" action (5s window)]
- [After create: redirect to new item's detail page]

---

### Components on this screen

| Component | Purpose | Key props/behavior |
|---|---|---|
| PageHeader | Title + primary CTA | title, onAction |
| DataTable | Display list of items | columns, data, onSort, onSelect |
| FilterBar | Filter + search | filters, onFilter |
| Pagination | Navigate pages | currentPage, totalPages, onPageChange |
| EmptyState | No data state | heading, subtext, ctaLabel, onCta |
| ConfirmDialog | Delete confirmation | isOpen, message, onConfirm, onCancel |

---

### Interactions

| User action | Response | Feedback |
|---|---|---|
| Click row | Navigate to /items/:id | — |
| Click "Delete" | Open ConfirmDialog | — |
| Confirm delete | Remove row, show toast | "Deleted successfully" (undo 5s) |
| Submit form | Validate → save → redirect | Loading state on button, then redirect |
| Sort column | Re-sort table, update URL | Column sort indicator changes |
| Filter | Filter results, update URL | URL updates so it's shareable |

---

### Accessibility

- All interactive elements keyboard-navigable (tab order: top-left to bottom-right)
- Focus ring visible on all focusable elements
- Table: proper scope on th, aria-sort on sortable columns
- Modals: focus trap, Escape closes, aria-modal="true"
- Empty state and error messages: role="status" or role="alert"
- Color never the only way to convey information (+ icon or text)
- WCAG 2.1 AA minimum contrast (4.5:1 body text, 3:1 large text)
```

---

## User Flow Diagram (text format)

```
FLOW: [Feature Name]

[Entry point: where user starts]
    │
    ▼
[Screen 1: Name] ──── [User action] ────►  [Screen 2: Name]
    │                                           │
    │ [Error condition]                   [Happy path]
    ▼                                           ▼
[Error state]                            [Screen 3: Name]
    │                                           │
    │ [Retry]                             [Completion]
    ▼                                           ▼
[Back to Screen 1]                      [Redirect to /dashboard]

EXAMPLE — Password Reset:

User clicks "Forgot password"
    │
    ▼
/forgot-password
  ┌─ Email input form
  ├─ [Submit valid email] ──────────────► /forgot-password/sent
  │                                        "Check your inbox"
  └─ [Invalid email] → inline error
         │
         ▼ (email received)
    Link in email clicked
         │
         ▼
/reset-password?token=[token]
  ┌─ [Token valid] → New password form
  │    ├─ [Submit valid] ──────────────► /login
  │    │                                 Toast: "Password updated"
  │    └─ [Passwords don't match] → inline error
  └─ [Token expired/invalid] → Error screen
         "This link has expired"
         CTA: "Request a new link"
```

---

## Design Tokens (generate these for every new feature/app)

```markdown
## Design Tokens — [Project/Feature Name]

### Colors

Primary palette:
  primary-50:   #[hex]   ← hover backgrounds
  primary-100:  #[hex]   ← selected backgrounds
  primary-500:  #[hex]   ← primary CTAs, links, focus rings
  primary-600:  #[hex]   ← hover state on primary buttons
  primary-700:  #[hex]   ← active/pressed state

Semantic:
  bg-default:     #[hex]  (page background)
  bg-surface:     #[hex]  (card, panel background)
  bg-subtle:      #[hex]  (table row hover, input background)
  text-primary:   #[hex]  (headings, primary body text)
  text-secondary: #[hex]  (captions, labels, placeholder)
  text-disabled:  #[hex]  (disabled input text)
  border-default: #[hex]  (card borders, dividers)
  border-strong:  #[hex]  (input focus border)
  
Feedback:
  success: #16a34a  error: #dc2626  warning: #d97706  info: #2563eb
  (with -50 light background variant for alert backgrounds)

### Typography
  font-family: "Inter", system-ui, sans-serif
  
  text-xs:   12px / 16px lineheight / 400 weight → captions, badges
  text-sm:   14px / 20px / 400 → secondary body, table cells
  text-base: 16px / 24px / 400 → primary body text
  text-lg:   18px / 28px / 500 → section headers, card titles
  text-xl:   20px / 28px / 600 → page section titles
  text-2xl:  24px / 32px / 600 → page titles
  text-3xl:  30px / 36px / 700 → hero headings
  text-4xl:  36px / 40px / 700 → marketing headings

### Spacing (4px base unit)
  space-1: 4px    space-2: 8px    space-3: 12px   space-4: 16px
  space-5: 20px   space-6: 24px   space-8: 32px   space-10: 40px
  space-12: 48px  space-16: 64px  space-20: 80px  space-24: 96px

### Borders & Radius
  rounded-sm: 4px   rounded: 6px   rounded-md: 8px
  rounded-lg: 12px  rounded-xl: 16px  rounded-full: 9999px

### Shadows
  shadow-sm: 0 1px 2px rgba(0,0,0,0.05)
  shadow:    0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)
  shadow-md: 0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)
  shadow-lg: 0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)
  shadow-xl: 0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)

### Breakpoints
  sm: 640px   md: 768px   lg: 1024px   xl: 1280px   2xl: 1536px
```

---

## Design Gap Decision Log

Every time the brief doesn't specify something, decide it and log it:

```markdown
## Design Decisions Log

| Gap found | Decision made | Reasoning |
|---|---|---|
| Empty state for /projects not specified | Illustration + "Create your first project" CTA | Standard pattern, reduces abandonment |
| Mobile nav not specified | Bottom tab bar with 4 main items | Thumb-friendly, industry standard on mobile |
| Error state for network failure | Inline retry card (not toast) | Network errors need user action; toast auto-dismisses |
| Delete confirmation not specified | Modal dialog with "Delete [item name]" | Destructive action needs explicit confirmation |
| Search debounce time not specified | 300ms | Balance between responsiveness and API load |
| Table row click behavior not specified | Navigate to detail page | Most natural affordance for data tables |
| Form autosave vs manual save | Manual save with "Unsaved changes" indicator | Safer — user controls when changes commit |
```

---

## Component Hierarchy (deliver this to frontend)

```
[PageName]
├── PageHeader
│   ├── Breadcrumb
│   ├── PageTitle
│   └── ActionBar
│       ├── SearchInput
│       └── CreateButton
│
├── FilterSection (collapsible on mobile)
│   ├── StatusFilter (Select)
│   ├── DateRangePicker
│   └── ClearFiltersButton
│
├── ContentArea
│   ├── [LoadingState] → DataTableSkeleton
│   ├── [EmptyState]   → EmptyState component
│   ├── [ErrorState]   → ErrorCard component
│   └── [DataState]    → DataTable
│       ├── TableHeader (sortable columns)
│       ├── TableBody
│       │   └── TableRow (×N) → clickable → navigate
│       └── TableFooter → Pagination
│
└── Modals (rendered via portal)
    ├── ConfirmDeleteDialog
    └── QuickEditDrawer
```

---

## Implementation Handoff Checklist

Deliver this checklist to the Frontend Architect after design approval:

```markdown
## Design Handoff — [Feature Name]

### Screens to build
- [ ] [Screen 1 name] — [route] — [desktop + mobile]
- [ ] [Screen 2 name] — [route] — [desktop only]

### Per screen, implement ALL states:
- [ ] Loading state (skeleton — not spinner)
- [ ] Empty state (illustration + CTA)
- [ ] Error state (inline card or toast per decision log)
- [ ] Data state (main content)
- [ ] Success feedback (toast / redirect — per screen spec)

### Components needed (new)
- [ ] [ComponentName] — [brief spec]
- [ ] [ComponentName] — [brief spec]

### Design tokens
- [ ] Add to tokens file: [list any new tokens]

### Interactions to implement
- [ ] [Interaction 1]
- [ ] [Interaction 2]

### Accessibility requirements
- [ ] Keyboard navigation tested
- [ ] Focus management in modals
- [ ] Screen reader tested (basic)
- [ ] WCAG AA contrast verified

### Design decisions to honour
→ See Design Decisions Log above
```
