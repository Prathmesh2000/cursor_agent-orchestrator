---
name: "i18n-l10n"
description: "Use when implementing internationalization, localization, multi-language support, or locale-specific formatting. Triggers: \"i18n\", \"internationalization\", \"localization\", \"l10n\", \"multi-language\", \"react-i18next\", \"translations\", \"RTL\", \"date formatting\", \"currency\", \"plural\", or when an app needs to support multiple languages or regions."
---


# i18n / l10n Skill

Implement production internationalization: react-i18next setup, translation management, plural/interpolation, date/currency formatting, RTL support, and CI translation checks.

---

## Setup (react-i18next)

```typescript
// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(HttpBackend)          // lazy-load translation files
  .use(LanguageDetector)     // auto-detect browser language
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'fr', 'de', 'es', 'ar', 'hi'],
    ns: ['common', 'auth', 'dashboard', 'errors'],
    defaultNS: 'common',
    backend: { loadPath: '/locales/{{lng}}/{{ns}}.json' },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false }, // React already XSS-safe
    react: { useSuspense: true },
  });

export default i18n;

// main.tsx: import './i18n'; (before App)
```

---

## Translation File Structure

```
public/locales/
  en/
    common.json       ← shared: buttons, labels, nav
    auth.json         ← login, register, reset
    dashboard.json    ← dashboard-specific strings
    errors.json       ← error messages
  fr/
    common.json
    auth.json
    ...
  ar/                 ← RTL language
    common.json
```

```json
// public/locales/en/common.json
{
  "nav": {
    "home": "Home",
    "settings": "Settings",
    "logout": "Log out"
  },
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "confirm": "Confirm"
  },
  "loading": "Loading…",
  "error": {
    "generic": "Something went wrong. Please try again.",
    "network": "Network error. Check your connection.",
    "notFound": "Page not found."
  },
  "pagination": {
    "showing": "Showing {{from}}-{{to}} of {{total}} results",
    "previous": "Previous",
    "next": "Next"
  },
  "items_count": {
    "zero": "No items",
    "one": "{{count}} item",
    "other": "{{count}} items"
  }
}
```

```json
// public/locales/fr/common.json
{
  "nav": {
    "home": "Accueil",
    "settings": "Paramètres",
    "logout": "Se déconnecter"
  },
  "actions": {
    "save": "Enregistrer",
    "cancel": "Annuler"
  },
  "items_count": {
    "zero": "Aucun élément",
    "one": "{{count}} élément",
    "other": "{{count}} éléments"
  }
}
```

---

## useTranslation Hook Patterns

```tsx
import { useTranslation, Trans } from 'react-i18next';

function MyComponent() {
  const { t, i18n } = useTranslation(['common', 'auth']);

  return (
    <div>
      {/* Basic */}
      <h1>{t('nav.home')}</h1>

      {/* Interpolation */}
      <p>{t('pagination.showing', { from: 1, to: 10, total: 100 })}</p>
      {/* → "Showing 1-10 of 100 results" */}

      {/* Plural */}
      <p>{t('items_count', { count: 5 })}</p>
      {/* → "5 items" */}

      {/* Namespace */}
      <p>{t('auth:loginTitle')}</p>

      {/* Rich text with components */}
      <Trans i18nKey="welcomeMessage" values={{ name: 'Alice' }}>
        Welcome, <strong>{{ name }}</strong>! Please <a href="/verify">verify your email</a>.
      </Trans>

      {/* Language switcher */}
      <select
        value={i18n.language}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
      >
        <option value="en">English</option>
        <option value="fr">Français</option>
        <option value="de">Deutsch</option>
        <option value="ar">العربية</option>
      </select>
    </div>
  );
}
```

---

## Date, Number & Currency Formatting

```typescript
// lib/formatters.ts — use Intl API, not moment.js
export function createFormatters(locale: string) {
  return {
    date: (date: Date, options?: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(locale, options ?? {
        year: 'numeric', month: 'long', day: 'numeric',
      }).format(date),

    dateShort: (date: Date) =>
      new Intl.DateTimeFormat(locale, { dateStyle: 'short' }).format(date),

    dateRelative: (date: Date) => {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
      const seconds = Math.round((date.getTime() - Date.now()) / 1000);
      if (Math.abs(seconds) < 60)  return rtf.format(seconds, 'second');
      if (Math.abs(seconds) < 3600) return rtf.format(Math.round(seconds/60), 'minute');
      if (Math.abs(seconds) < 86400)return rtf.format(Math.round(seconds/3600), 'hour');
      return rtf.format(Math.round(seconds/86400), 'day');
    },

    currency: (amount: number, currency: string) =>
      new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount),

    number: (n: number) =>
      new Intl.NumberFormat(locale).format(n),

    percent: (n: number) =>
      new Intl.NumberFormat(locale, { style: 'percent', minimumFractionDigits: 1 }).format(n),
  };
}

// Hook
export function useFormatters() {
  const { i18n } = useTranslation();
  return useMemo(() => createFormatters(i18n.language), [i18n.language]);
}
```

---

## RTL Support

```tsx
// App.tsx — set dir on html element
function App() {
  const { i18n } = useTranslation();
  const isRTL = ['ar', 'he', 'fa', 'ur'].includes(i18n.language);

  useEffect(() => {
    document.documentElement.dir  = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language, isRTL]);
}
```

```scss
// Use logical properties (auto-flip for RTL):
.card {
  padding-inline-start: 16px;  // ← replaces padding-left
  padding-inline-end: 16px;    // ← replaces padding-right
  margin-inline-end: 8px;      // ← replaces margin-right
  border-inline-start: 2px solid blue; // ← replaces border-left
}
```

---

## CI Translation Check

```typescript
// scripts/check-translations.ts
import * as fs from 'fs';
import * as path from 'path';

const SUPPORTED_LANGS = ['en', 'fr', 'de', 'es'];
const NS = ['common', 'auth', 'dashboard', 'errors'];

function flattenKeys(obj: any, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' ? flattenKeys(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  );
}

let failed = false;
for (const ns of NS) {
  const enKeys = flattenKeys(JSON.parse(fs.readFileSync(`public/locales/en/${ns}.json`, 'utf-8')));
  for (const lang of SUPPORTED_LANGS.filter(l => l !== 'en')) {
    try {
      const langKeys = flattenKeys(JSON.parse(fs.readFileSync(`public/locales/${lang}/${ns}.json`, 'utf-8')));
      const missing = enKeys.filter(k => !langKeys.includes(k));
      if (missing.length) {
        console.error(`❌ ${lang}/${ns}: missing ${missing.length} keys:`, missing);
        failed = true;
      } else {
        console.log(`✅ ${lang}/${ns}: all ${enKeys.length} keys present`);
      }
    } catch {
      console.error(`❌ Missing file: public/locales/${lang}/${ns}.json`);
      failed = true;
    }
  }
}
if (failed) process.exit(1);
```

```yaml
# .github/workflows/i18n-check.yml
- name: Check translations
  run: npx ts-node scripts/check-translations.ts
```
