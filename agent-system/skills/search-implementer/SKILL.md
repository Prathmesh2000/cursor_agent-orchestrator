---
name: search-implementer
description: Use when implementing search functionality. Triggers: "search", "full-text search", "PostgreSQL search", "Elasticsearch", "Typesense", "Algolia", "search index", "fuzzy search", "autocomplete", "search relevance", or any feature where users need to find content.
---

# Search Implementer Skill

Implement production search: PostgreSQL full-text search for simple cases, Typesense/Elasticsearch for advanced needs. Always includes relevance ranking, highlighting, and autocomplete.

---

## Decision Matrix

```
Use PostgreSQL FTS when:         Use Typesense/Elasticsearch when:
  < 1M rows                        > 1M rows
  Simple keyword match             Fuzzy/typo-tolerant search
  No typo tolerance needed         Faceting/filters UI
  Same DB, low ops overhead        Autocomplete with sub-100ms
  < 50 search req/second           Multi-language stemming
```

---

## PostgreSQL Full-Text Search

```sql
-- Add tsvector column (updated by trigger)
ALTER TABLE posts
  ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(body, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(tags::text, '')), 'C')
    ) STORED;

-- GIN index (required for performance)
CREATE INDEX idx_posts_search ON posts USING gin(search_vector);

-- Search query
SELECT
  id, title, tags,
  ts_rank(search_vector, query) AS rank,
  ts_headline('english', body, query, 'MaxWords=50,MinWords=25') AS excerpt
FROM posts, to_tsquery('english', :query) query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 20;
```

```typescript
// services/search.service.ts
export async function searchPosts(rawQuery: string, filters: SearchFilters) {
  // Convert user input to tsquery (handle special chars)
  const tsQuery = rawQuery
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.replace(/[^a-zA-Z0-9]/g, '') + ':*') // prefix match
    .join(' & ');

  const [results] = await sequelize.query(`
    SELECT
      p.id, p.title, p.slug, p.created_at,
      u.name AS author,
      ts_rank(p.search_vector, query) AS rank,
      ts_headline('english', p.body, query,
        'MaxWords=40,MinWords=20,StartSel=<mark>,StopSel=</mark>') AS excerpt
    FROM posts p
    JOIN users u ON u.id = p.author_id,
    to_tsquery('english', :tsQuery) query
    WHERE
      p.search_vector @@ query
      ${filters.tag    ? 'AND :tag = ANY(p.tags)'              : ''}
      ${filters.after  ? 'AND p.created_at > :after'           : ''}
      ${filters.status ? 'AND p.status = :status'              : ''}
    ORDER BY rank DESC
    LIMIT :limit OFFSET :offset
  `, {
    replacements: {
      tsQuery, limit: filters.limit ?? 20,
      offset: (filters.page ?? 0) * (filters.limit ?? 20),
      ...filters,
    },
    type: QueryTypes.SELECT,
  });

  return results;
}
```

---

## Typesense (typo-tolerant, fast autocomplete)

```bash
# Start Typesense (Docker)
docker run -d -p 8108:8108 \
  -v /data/typesense:/data \
  typesense/typesense:0.25.2 \
  --data-dir /data --api-key=your-api-key --enable-cors
```

```typescript
// lib/typesense.ts
import Typesense from 'typesense';

export const typesense = new Typesense.Client({
  nodes: [{ host: process.env.TYPESENSE_HOST!, port: 8108, protocol: 'http' }],
  apiKey: process.env.TYPESENSE_API_KEY!,
  connectionTimeoutSeconds: 2,
});

// Schema definition
export const POSTS_SCHEMA = {
  name: 'posts',
  fields: [
    { name: 'id',         type: 'string' as const },
    { name: 'title',      type: 'string' as const, infix: true },
    { name: 'body',       type: 'string' as const },
    { name: 'author',     type: 'string' as const, facet: true },
    { name: 'tags',       type: 'string[]' as const, facet: true },
    { name: 'created_at', type: 'int64' as const, sort: true },
    { name: 'status',     type: 'string' as const, facet: true },
  ],
  default_sorting_field: 'created_at',
};
```

```typescript
// services/search.service.ts
export async function searchPosts(query: string, options: SearchOptions) {
  const searchParams = {
    q:              query || '*',
    query_by:       'title,body,tags',
    query_by_weights: '3,1,2',
    typo_tokens_threshold: 1,
    filter_by:      buildFilters(options),  // "status:=published && tags:=[tech,ai]"
    facet_by:       'tags,author,status',
    sort_by:        options.sortBy ?? '_text_match:desc,created_at:desc',
    per_page:       options.limit ?? 20,
    page:           options.page ?? 1,
    highlight_full_fields: 'title',
    highlight_affix_num_tokens: 10,
  };

  const result = await typesense.collections('posts').documents().search(searchParams);
  return {
    hits:       result.hits?.map(h => ({ ...h.document, excerpt: h.highlight?.body?.snippet })),
    total:      result.found,
    facets:     result.facet_counts,
    took:       result.search_time_ms,
  };
}

// Keep index in sync
export async function indexPost(post: Post) {
  await typesense.collections('posts').documents().upsert({
    id: String(post.id), title: post.title, body: post.body,
    author: post.author.name, tags: post.tags,
    status: post.status, created_at: Math.floor(post.createdAt.getTime() / 1000),
  });
}

export async function removeFromIndex(postId: string) {
  await typesense.collections('posts').documents(postId).delete();
}
```

---

## React Search Hook with Debounce

```typescript
// hooks/useSearch.ts
import { useQuery } from '@tanstack/react-query';
import { useDeferredValue, useState } from 'react';

export function useSearch<T>(
  searchFn: (q: string) => Promise<T[]>,
  options = { minLength: 2, staleTime: 30_000 }
) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query); // React 18 — defer during typing

  const { data, isLoading } = useQuery({
    queryKey: ['search', deferredQuery],
    queryFn:  () => searchFn(deferredQuery),
    enabled:  deferredQuery.length >= options.minLength,
    staleTime: options.staleTime,
    placeholderData: (prev) => prev, // keep previous results while typing
  });

  return { query, setQuery, results: data ?? [], isLoading };
}
```

---

## Output Files

```
src/
  services/search.service.ts    ← search logic
  lib/typesense.ts              ← client + schema
  hooks/useSearch.ts            ← React hook
  components/SearchBar/         ← UI component
db/migrations/
  add-search-vector-to-posts.sql
```
