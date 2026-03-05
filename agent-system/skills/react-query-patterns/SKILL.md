---
name: "react-query-patterns"
description: "Use when implementing data fetching, caching, server state synchronization, optimistic updates, infinite scroll, or background refetching in React. Triggers: \"React Query\", \"TanStack Query\", \"useQuery\", \"useMutation\", \"data fetching\", \"caching\", \"optimistic update\", \"infinite scroll\", \"stale-while-revalidate\", \"server state\", or when managing async data in React components."
---


# React Query Patterns Skill

Implement production-grade server state management: queries, mutations, optimistic updates, infinite scroll, prefetching, and cache invalidation.

---

## Setup

```typescript
// main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 min — don't refetch if fresh
      gcTime:    10 * 60 * 1000,     // 10 min — keep in cache after unmount
      retry: (failureCount, error: any) => {
        if (error?.status >= 400 && error?.status < 500) return false; // don't retry 4xx
        return failureCount < 3;
      },
      refetchOnWindowFocus: true,    // refresh when user returns to tab
    },
    mutations: { retry: 0 },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>...</Router>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

---

## Query Key Factory (prevents typos, enables targeted invalidation)

```typescript
// lib/queryKeys.ts
export const queryKeys = {
  users: {
    all:    () => ['users'] as const,
    lists:  () => ['users', 'list'] as const,
    list:   (filters: object) => ['users', 'list', filters] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
  },
  posts: {
    all:    () => ['posts'] as const,
    list:   (filters: object) => ['posts', 'list', filters] as const,
    detail: (id: string) => ['posts', 'detail', id] as const,
  },
};
```

---

## Queries

```typescript
// hooks/useUsers.ts
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { usersApi } from '../api/users';

// Standard query
export function useUsers(filters = {}) {
  return useQuery({
    queryKey: queryKeys.users.list(filters),
    queryFn:  () => usersApi.getAll(filters),
    select:   (data) => data.sort((a, b) => a.name.localeCompare(b.name)), // transform
  });
}

// Single resource
export function useUser(id: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn:  () => usersApi.getById(id),
    enabled:  !!id,   // don't fetch if no id
  });
}

// Usage:
function UserList({ filters }) {
  const { data: users, isLoading, error, isFetching } = useUsers(filters);
  if (isLoading) return <TableSkeleton />;
  if (error)     return <ErrorState message={error.message} />;
  return (
    <>
      {isFetching && <LinearProgress />}  {/* background refetch indicator */}
      {users?.map(u => <UserRow key={u.id} user={u} />)}
    </>
  );
}
```

---

## Mutations with Optimistic Updates

```typescript
// hooks/useUserMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: (newUser) => {
      // Invalidate list — will refetch in background
      qc.invalidateQueries({ queryKey: queryKeys.users.lists() });
      // Pre-populate detail cache immediately
      qc.setQueryData(queryKeys.users.detail(newUser.id), newUser);
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => usersApi.update(id, data),

    // Optimistic update — update UI before server responds
    onMutate: async ({ id, ...updates }) => {
      await qc.cancelQueries({ queryKey: queryKeys.users.detail(id) });
      const previous = qc.getQueryData(queryKeys.users.detail(id));
      qc.setQueryData(queryKeys.users.detail(id), (old: any) => ({ ...old, ...updates }));
      return { previous, id }; // return context for rollback
    },
    onError: (err, _, context: any) => {
      // Rollback on error
      qc.setQueryData(queryKeys.users.detail(context.id), context.previous);
    },
    onSettled: (_, __, { id }) => {
      // Always refetch after optimistic update
      qc.invalidateQueries({ queryKey: queryKeys.users.detail(id) });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.delete,
    onMutate: async (id) => {
      // Optimistically remove from list
      await qc.cancelQueries({ queryKey: queryKeys.users.lists() });
      const previous = qc.getQueryData(queryKeys.users.lists());
      qc.setQueryData(queryKeys.users.lists(), (old: any[]) =>
        old?.filter(u => u.id !== id)
      );
      return { previous };
    },
    onError: (_, __, context: any) => {
      qc.setQueryData(queryKeys.users.lists(), context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.users.all() }),
  });
}
```

---

## Infinite Scroll

```typescript
// hooks/useInfinitePosts.ts
import { useInfiniteQuery } from '@tanstack/react-query';

export function useInfinitePosts(filters = {}) {
  return useInfiniteQuery({
    queryKey: ['posts', 'infinite', filters],
    queryFn: ({ pageParam = 1 }) => postsApi.getPage(pageParam, filters),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextPage : undefined,
    select: (data) => ({
      pages: data.pages,
      allPosts: data.pages.flatMap(page => page.items), // flattened
    }),
  });
}

// Usage with IntersectionObserver
function PostFeed() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfinitePosts();
  const sentinelRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
    }, { threshold: 0.5 });
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div>
      {data?.allPosts.map(post => <PostCard key={post.id} post={post} />)}
      <div ref={sentinelRef}>
        {isFetchingNextPage && <LoadingSpinner />}
        {!hasNextPage && <p>All caught up!</p>}
      </div>
    </div>
  );
}
```

---

## Prefetching (for hover + navigation)

```typescript
// Prefetch on hover
function UserLink({ userId, children }) {
  const qc = useQueryClient();
  return (
    <Link
      to={`/users/${userId}`}
      onMouseEnter={() => qc.prefetchQuery({
        queryKey: queryKeys.users.detail(userId),
        queryFn:  () => usersApi.getById(userId),
        staleTime: 30_000,
      })}
    >
      {children}
    </Link>
  );
}

// Prefetch in route loader (React Router v6.4+)
export async function userLoader({ params }: any) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.users.detail(params.id),
    queryFn:  () => usersApi.getById(params.id),
  });
  return null;
}
```

---

## Mutation + Toast Pattern

```typescript
function DeleteButton({ userId }) {
  const { mutate: deleteUser, isPending } = useDeleteUser();
  const { addNotification } = useAppStore();

  return (
    <Button
      variant="soft"
      color="error"
      loading={isPending}
      onClick={() => deleteUser(userId, {
        onSuccess: () => addNotification({ type: 'success', message: 'User deleted' }),
        onError:   (e) => addNotification({ type: 'error', message: e.message }),
      })}
    >
      Delete
    </Button>
  );
}
```
