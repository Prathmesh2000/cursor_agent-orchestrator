---
name: "content-writer"
description: "Use for all user-facing copy: button labels, error messages, empty states, tooltips, onboarding, emails, notifications, help text. Triggers: \"write copy\", \"error message\", \"microcopy\", \"onboarding text\", \"email template\", or after UI design is done."
---


# Content Writer Skill

Write clear, human, on-brand copy for every user-facing surface.

---

## Copy Principles

1. **Clear over clever** — users scan, not read
2. **Action-oriented** — verbs in buttons ("Save changes" not "Submit")
3. **Specific errors** — tell user what went wrong AND what to do
4. **Human tone** — conversational, not corporate
5. **Consistent voice** — same terminology everywhere

---

## Copy Types

### Buttons & CTAs
```
Primary action:   verb + object  →  "Save changes", "Create project", "Send message"
Destructive:      "Delete [thing]" (be specific)
Cancel/secondary: "Cancel", "Go back", "Keep editing"
Loading:          "Saving…", "Creating…" (match primary action)
```

### Error Messages
```
Structure: [What happened] + [Why] + [How to fix]

❌ Bad:  "Error 400"
❌ Bad:  "Invalid input"
✅ Good: "Email already in use — try logging in or use a different email"
✅ Good: "Password must be at least 12 characters — yours has 8"
✅ Good: "Couldn't connect to server — check your internet and try again"
```

### Empty States
```
Structure: [Icon] + [What's empty] + [Why user is here] + [CTA]

Example:
  🗂️ No projects yet
  Create your first project to get started.
  [+ New project]
```

### Success Messages
```
Be specific, not generic:
❌ "Success!"
✅ "Project created — you can now invite your team"
✅ "Password updated — you'll use this next time you log in"
```

### Tooltips
```
Max 1 sentence. Answer "what does this do?" or "why should I care?"
❌ "Settings"
✅ "Control who can view and edit this project"
```

### Form Labels & Placeholders
```
Labels:       noun phrases, title case  →  "Email address", "First name"
Placeholders: examples, not instructions  →  "you@example.com", "John"
Helper text:  constraints or context  →  "Minimum 12 characters"
Required:     mark with * and explain at top of form
```

### Email Templates

```markdown
Subject: [Specific, not generic — "Your password has been reset"]

Body:
  Hi [First name],

  [1-sentence reason for email]

  [Key info or action needed]

  [CTA button]

  [What happens next / reassurance]

  [Signature]
```

### Onboarding / Empty Onboarding
```
Step N of N
[Progress bar]

[Friendly heading]
[1–2 sentences of benefit, not instructions]
[CTA]
[Skip option if applicable]
```

---

## Deliverable Format

```markdown
## Copy Inventory: [Feature Name]

| Location | Element | Copy |
|----------|---------|------|
| /login | Page title | "Welcome back" |
| /login | Email label | "Email address" |
| /login | Submit button | "Sign in" |
| /login | Submit (loading) | "Signing in…" |
| /login | Error: wrong password | "Incorrect password — try again or reset your password" |
| /login | Error: account locked | "Account locked after 5 attempts — check your email to unlock" |
| /login | Forgot password link | "Forgot your password?" |
```

---

## Voice & Tone Reference

| Situation | Tone | Example |
|---|---|---|
| Normal flow | Friendly, direct | "Save changes" |
| Error | Helpful, calm | "Something went wrong — try again" |
| Success | Warm, affirming | "All done! Your project is live" |
| Destructive action | Clear, cautious | "Delete project? This can't be undone" |
| Empty state | Encouraging | "No tasks yet — add your first one" |
