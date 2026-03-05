---
name: "crawler"
description: "Use for writing web crawling and scraping scripts. Triggers: \"crawl\", \"scrape\", \"extract data from website\", \"web scraper\", \"automate browser\", \"collect data from\", \"monitor website\", \"download data from URL\", \"parse site\", \"crawl and extract\". Opens the target URL in Cursor browser to inspect structure before writing code. Asks clarifying questions before writing a single line."
---


# Crawler Skill

Write production-grade web crawling and scraping scripts.
Always inspect the real site before writing code.
Always ask before assuming.

---

## The Core Rule

```
NEVER write a crawler without:
  1. Opening the target URL and inspecting the actual structure
  2. Completing the interview protocol (what, how much, how often, legal)
  3. Getting explicit confirmation on output format

A crawler written against guessed HTML = a crawler that breaks on first run.
```

---

## Interview Protocol (ask ALL before writing)

### Round 1 — Target + Goal

```
🔍 Before I write the crawler, I need to understand the target.

1. What is the URL (or list of URLs) to crawl?
2. What data do you want to extract?
   List every field:
   → Example: "product name, price, rating, image URL, description"
3. Scope:
   → One page only?
   → One page + follow pagination?
   → One page + follow all links?
   → Entire site / sitemap?
   → Multiple URLs from a list?
4. How often will this run?
   → One-time extraction
   → Daily / weekly scheduled job
   → Real-time / on-demand
5. Output format:
   → JSON file / CSV file / database (which?) / console / API
6. Volume estimate:
   → ~how many pages / records expected?
```

Wait for answers.

### Round 2 — Technical + Legal

```
🔍 A few more things before I start:

7. Does the site require login?
   → Yes: do you have credentials I can use, or should the script
     prompt for them interactively?
8. Does the site have a robots.txt or terms of service that
   restricts scraping?
   → I'll check this when I open the URL.
9. Does the site use JavaScript to render content?
   → I'll check this too — determines if we need Playwright or
     if plain HTTP requests (cheerio/axios) are enough.
10. Should the crawler handle errors and retry?
    → Yes (recommended) or No (fail fast)?
11. Any rate limiting needed?
    → e.g. "max 1 request per 2 seconds to be polite"
12. Any authentication headers or cookies needed?
    → API keys, session tokens, etc.
```

Wait for answers.

Then summarise:
```
"Here's what I'll build:
 Target: [URL(s)]
 Extract: [field list]
 Scope: [pages]
 Library: [Playwright / Cheerio+Axios / Puppeteer — explain why]
 Output: [format + location]
 Schedule: [one-time / cron]
 Rate limit: [N req/sec]
 Auth: [none / credentials / headers]

Does this match what you need? Anything to change?"
```

Wait for confirmation.

---

## Step 1 — Open and Inspect (ALWAYS before writing code)

```
Open target URL in Cursor browser.

INSPECT:
  □ Check robots.txt → https://[domain]/robots.txt
    Note: any disallowed paths that affect the crawl target
  
  □ Check if content is server-rendered or JS-rendered:
    View source (Ctrl+U) → is the data in the HTML source?
    YES → use Cheerio + Axios (fast, lightweight)
    NO  → use Playwright (handles JS-rendered pages)

  □ Find the CSS selectors / XPath for each field:
    Open DevTools → Inspect element → find stable selectors
    Prefer: data-testid / id / semantic tags
    Avoid: deeply nested nth-child selectors (break with layout changes)

  □ Find pagination pattern:
    Next button selector? URL pattern (/page/2, ?page=2, ?offset=20)?
    Infinite scroll? (needs scroll simulation in Playwright)
    Total pages shown? (for progress tracking)

  □ Check for anti-bot signals:
    Cloudflare / reCAPTCHA / rate limit headers?
    → Note: do NOT bypass security measures. If site blocks scraping,
      tell the user and suggest alternatives (official API, data export).

CONFIRM selectors with user:
  "I found these selectors — do they look right?
   Product name:  .product-title
   Price:         [data-price]
   Rating:        .star-rating span
   Image:         .product-image img[src]
   Next page:     a.pagination-next[href]"
```

---

## Library Decision

```
USE Cheerio + Axios when:
  ✅ Content visible in page source (server-rendered)
  ✅ No login required (or login via headers/cookies)
  ✅ High volume (10k+ pages) — faster and lighter
  ✅ Simple structure, stable HTML

USE Playwright when:
  ✅ Content loaded by JavaScript (React, Vue, Angular apps)
  ✅ Login flow required (fill form, click, wait)
  ✅ Infinite scroll / click-to-load-more pagination
  ✅ Dynamic selectors that need wait conditions
  ✅ Screenshots or PDF output needed
  ✅ Complex user interactions needed

USE Puppeteer when:
  ✅ Chrome-specific features needed
  ✅ Puppeteer cluster for parallel crawling
  ✅ Existing Puppeteer codebase

NEVER use Selenium for new code — Playwright is the modern replacement.
```

---

## Production Crawler Template — Cheerio + Axios

```typescript
// crawler-[target].ts
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

// ── CONFIG ────────────────────────────────────────────────────────
const CONFIG = {
  baseUrl: 'https://example.com',
  startUrl: 'https://example.com/products',
  outputFile: 'output/products.json',
  rateLimit: 1000,      // ms between requests
  maxRetries: 3,
  retryDelay: 2000,     // ms before retry
  timeout: 10000,       // ms request timeout
  userAgent: 'Mozilla/5.0 (compatible; research-crawler/1.0)',
};

// ── TYPES ─────────────────────────────────────────────────────────
interface Product {
  name: string;
  price: string;
  rating: string;
  imageUrl: string;
  url: string;
  scrapedAt: string;
}

interface CrawlResult {
  total: number;
  pages: number;
  items: Product[];
  errors: string[];
}

// ── HTTP CLIENT ───────────────────────────────────────────────────
const client = axios.create({
  timeout: CONFIG.timeout,
  headers: {
    'User-Agent': CONFIG.userAgent,
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'en-US,en;q=0.9',
  },
});

// ── RATE LIMITER ──────────────────────────────────────────────────
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
let lastRequest = 0;

async function rateLimitedGet(url: string): Promise<string> {
  const now = Date.now();
  const wait = CONFIG.rateLimit - (now - lastRequest);
  if (wait > 0) await sleep(wait);
  lastRequest = Date.now();

  for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      const res = await client.get(url);
      return res.data;
    } catch (err: any) {
      const isLast = attempt === CONFIG.maxRetries;
      const status = err.response?.status;
      console.warn(`  Attempt ${attempt} failed for ${url}: ${status || err.message}`);

      if (status === 404) throw new Error(`404: ${url}`);
      if (status === 403) throw new Error(`403 Forbidden — site may block scraping: ${url}`);
      if (isLast) throw err;
      
      await sleep(CONFIG.retryDelay * attempt); // exponential backoff
    }
  }
  throw new Error('Unreachable');
}

// ── PARSERS ───────────────────────────────────────────────────────
function parseProducts(html: string, pageUrl: string): Product[] {
  const $ = cheerio.load(html);
  const products: Product[] = [];

  // Replace selectors with inspected values:
  $('.product-card').each((_, el) => {
    const name = $(el).find('.product-title').text().trim();
    const price = $(el).find('[data-price]').attr('data-price') ?? $(el).find('.price').text().trim();
    const rating = $(el).find('.star-rating').attr('aria-label') ?? '';
    const imageUrl = $(el).find('img').attr('src') ?? '';
    const href = $(el).find('a').attr('href') ?? '';

    if (!name) return; // skip empty cards

    products.push({
      name,
      price,
      rating,
      imageUrl: imageUrl.startsWith('http') ? imageUrl : `${CONFIG.baseUrl}${imageUrl}`,
      url: href.startsWith('http') ? href : `${CONFIG.baseUrl}${href}`,
      scrapedAt: new Date().toISOString(),
    });
  });

  return products;
}

function getNextPageUrl(html: string, currentUrl: string): string | null {
  const $ = cheerio.load(html);
  // Adjust selector to match actual pagination:
  const nextHref = $('a.pagination-next, a[rel="next"], .next-page a').attr('href');
  if (!nextHref) return null;
  return nextHref.startsWith('http') ? nextHref : `${CONFIG.baseUrl}${nextHref}`;
}

// ── MAIN CRAWL LOOP ───────────────────────────────────────────────
async function crawl(): Promise<CrawlResult> {
  const result: CrawlResult = { total: 0, pages: 0, items: [], errors: [] };
  let url: string | null = CONFIG.startUrl;
  let page = 1;

  console.log(`\n🕷️  Starting crawl: ${CONFIG.startUrl}`);
  console.log(`   Rate limit: ${CONFIG.rateLimit}ms between requests\n`);

  while (url) {
    console.log(`   Page ${page}: ${url}`);
    
    try {
      const html = await rateLimitedGet(url);
      const items = parseProducts(html, url);
      result.items.push(...items);
      result.pages++;
      
      console.log(`   ✅ Found ${items.length} items (total: ${result.items.length})`);
      
      url = getNextPageUrl(html, url);
      page++;
    } catch (err: any) {
      console.error(`   ❌ Page ${page} failed: ${err.message}`);
      result.errors.push(`Page ${page} (${url}): ${err.message}`);
      url = null; // stop on error — or change to `continue` to skip and move on
    }
  }

  result.total = result.items.length;
  return result;
}

// ── OUTPUT ────────────────────────────────────────────────────────
function writeOutput(result: CrawlResult): void {
  const dir = path.dirname(CONFIG.outputFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  fs.writeFileSync(CONFIG.outputFile, JSON.stringify(result.items, null, 2));
  
  console.log(`\n📊 Crawl complete:`);
  console.log(`   Pages:  ${result.pages}`);
  console.log(`   Items:  ${result.total}`);
  console.log(`   Errors: ${result.errors.length}`);
  if (result.errors.length) {
    console.log(`   Error details:`);
    result.errors.forEach(e => console.log(`     - ${e}`));
  }
  console.log(`   Output: ${CONFIG.outputFile}\n`);
}

// ── ENTRY ─────────────────────────────────────────────────────────
crawl().then(writeOutput).catch(err => {
  console.error('Fatal crawl error:', err.message);
  process.exit(1);
});
```

---

## Production Crawler Template — Playwright (JS-rendered / login)

```typescript
// crawler-playwright-[target].ts
import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';

// ── CONFIG ────────────────────────────────────────────────────────
const CONFIG = {
  startUrl: 'https://example.com/products',
  outputFile: 'output/products.json',
  rateLimit: 1500,       // ms between page loads
  headless: true,        // set false to watch / debug
  maxPages: 100,         // safety cap
};

// ── TYPES ─────────────────────────────────────────────────────────
interface Product {
  name: string;
  price: string;
  url: string;
  scrapedAt: string;
}

// ── LOGIN HELPER (if needed) ──────────────────────────────────────
async function login(page: Page, credentials: { email: string; password: string }): Promise<void> {
  await page.goto('https://example.com/login');
  await page.fill('input[name="email"]', credentials.email);
  await page.fill('input[name="password"]', credentials.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  console.log('   ✅ Logged in');
}

// ── USER INPUT PROMPT (for credentials at runtime) ────────────────
async function promptCredentials(): Promise<{ email: string; password: string }> {
  const readline = await import('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  
  return new Promise((resolve) => {
    rl.question('Email: ', (email) => {
      // Hide password input
      process.stdout.write('Password: ');
      process.stdin.setRawMode?.(true);
      let password = '';
      process.stdin.on('data', function handler(char) {
        const c = char.toString();
        if (c === '\n' || c === '\r') {
          process.stdin.setRawMode?.(false);
          process.stdin.removeListener('data', handler);
          process.stdout.write('\n');
          rl.close();
          resolve({ email, password });
        } else if (c === '\u0003') {
          process.exit(); // Ctrl+C
        } else {
          password += c;
          process.stdout.write('*');
        }
      });
    });
  });
}

// ── PARSE ONE PAGE ────────────────────────────────────────────────
async function parsePage(page: Page): Promise<Product[]> {
  // Wait for content to render:
  await page.waitForSelector('.product-card', { timeout: 10000 });
  
  // Extract data using page.evaluate (runs in browser context):
  return page.evaluate(() => {
    const cards = document.querySelectorAll('.product-card');
    return Array.from(cards).map(el => ({
      name: el.querySelector('.product-title')?.textContent?.trim() ?? '',
      price: (el.querySelector('[data-price]') as HTMLElement)?.dataset.price
             ?? el.querySelector('.price')?.textContent?.trim() ?? '',
      url: (el.querySelector('a') as HTMLAnchorElement)?.href ?? '',
      scrapedAt: new Date().toISOString(),
    })).filter(p => p.name); // skip empty cards
  });
}

// ── PAGINATION: handle "Load more" button ─────────────────────────
async function loadAllItems(page: Page): Promise<void> {
  // Infinite scroll / load more pattern:
  let attempts = 0;
  while (attempts < CONFIG.maxPages) {
    const btn = page.locator('button.load-more, [data-load-more]');
    const visible = await btn.isVisible().catch(() => false);
    if (!visible) break;
    await btn.click();
    await page.waitForTimeout(1500); // wait for new items
    attempts++;
  }
}

// ── PAGINATION: handle page navigation ────────────────────────────
async function getNextPageUrl(page: Page): Promise<string | null> {
  const next = page.locator('a.pagination-next, a[rel="next"]');
  const visible = await next.isVisible().catch(() => false);
  if (!visible) return null;
  return next.getAttribute('href');
}

// ── MAIN ──────────────────────────────────────────────────────────
async function crawl(): Promise<void> {
  const browser: Browser = await chromium.launch({ headless: CONFIG.headless });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (compatible; research-crawler/1.0)',
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();
  const allItems: Product[] = [];

  console.log('\n🎭 Playwright crawler starting...');

  try {
    // ── LOGIN (uncomment if needed) ────────────────────────────
    // const creds = await promptCredentials();
    // await login(page, creds);

    // ── CRAWL ──────────────────────────────────────────────────
    let url: string | null = CONFIG.startUrl;
    let pageNum = 1;

    while (url && pageNum <= CONFIG.maxPages) {
      console.log(`   Page ${pageNum}: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(CONFIG.rateLimit);

      const items = await parsePage(page);
      allItems.push(...items);
      console.log(`   ✅ ${items.length} items (total: ${allItems.length})`);

      url = await getNextPageUrl(page);
      pageNum++;
    }

  } finally {
    await browser.close();
  }

  // ── WRITE OUTPUT ───────────────────────────────────────────────
  fs.mkdirSync('output', { recursive: true });
  fs.writeFileSync(CONFIG.outputFile, JSON.stringify(allItems, null, 2));
  console.log(`\n✅ Done: ${allItems.length} items → ${CONFIG.outputFile}\n`);
}

crawl().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
```

---

## CSV Output Variant

```typescript
import { createObjectCsvWriter } from 'csv-writer';

async function writeCsv(items: any[], outputFile: string): Promise<void> {
  if (!items.length) return;
  
  const headers = Object.keys(items[0]).map(id => ({ id, title: id.toUpperCase() }));
  const writer = createObjectCsvWriter({ path: outputFile, header: headers });
  
  await writer.writeRecords(items);
  console.log(`CSV written: ${outputFile} (${items.length} rows)`);
}
```

---

## Database Output Variant (PostgreSQL)

```typescript
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function writeToDb(items: Product[], tableName: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const item of items) {
      await client.query(
        `INSERT INTO ${tableName} (name, price, rating, image_url, source_url, scraped_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (source_url) DO UPDATE
         SET name=$1, price=$2, rating=$3, image_url=$4, scraped_at=$6`,
        [item.name, item.price, item.rating, item.imageUrl, item.url, item.scrapedAt]
      );
    }
    await client.query('COMMIT');
    console.log(`Upserted ${items.length} rows into ${tableName}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```

---

## Scheduled Crawler (cron)

```typescript
// Run with: npx ts-node scheduler.ts
import * as cron from 'node-cron';
import { crawl } from './crawler';

// Every day at 6am
cron.schedule('0 6 * * *', async () => {
  console.log(`[${new Date().toISOString()}] Scheduled crawl starting...`);
  try {
    await crawl();
    console.log('Crawl complete');
  } catch (err: any) {
    console.error('Scheduled crawl failed:', err.message);
    // TODO: send alert (email/Slack) on failure
  }
});

console.log('Scheduler started. Crawl runs daily at 6:00 AM.');
```

---

## Anti-Detection Practices

```typescript
// Rotate user agents
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
];

// Random delay between min and max
const randomDelay = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// Random UA per request
const randomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
```

---

## robots.txt Checker

```typescript
import robotsParser from 'robots-parser';

async function canCrawl(url: string): Promise<boolean> {
  const { origin, pathname } = new URL(url);
  try {
    const res = await axios.get(`${origin}/robots.txt`, { timeout: 5000 });
    const robots = robotsParser(`${origin}/robots.txt`, res.data);
    const allowed = robots.isAllowed(pathname, 'research-crawler') ?? true;
    if (!allowed) {
      console.warn(`⚠️  robots.txt disallows: ${pathname}`);
    }
    return allowed;
  } catch {
    return true; // no robots.txt = assume allowed
  }
}
```

---

## Package Setup

```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "cheerio": "^1.0.0",
    "playwright": "^1.40.0",
    "csv-writer": "^1.6.0",
    "robots-parser": "^3.0.0",
    "node-cron": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "ts-node": "^10.9.0"
  },
  "scripts": {
    "crawl": "ts-node crawler.ts",
    "schedule": "ts-node scheduler.ts"
  }
}
```

---

## Crawler Checklist (before delivery)

```
□ robots.txt checked and respected
□ Rate limiting in place (≥1s between requests)
□ Retry logic with exponential backoff
□ Error handling: each page failure logged, crawl continues
□ Output directory created if missing
□ All fields extracted and typed correctly
□ Pagination tested beyond page 1
□ Empty page / end-of-results handled gracefully
□ Large volume tested (not just 1 page)
□ Credentials never hardcoded — from env vars or runtime prompt
□ Login session maintained across pages (if applicable)
□ Selectors confirmed against real page (not assumed)
```
