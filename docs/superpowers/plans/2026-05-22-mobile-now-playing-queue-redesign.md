# Mobile Now Playing + Queue Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify NowPlayingView into a single responsive full-screen template matching desktop design, and make the mobile queue a half-sheet that overlays on top of now playing instead of closing it.

**Architecture:** Remove the `isDesktop`-gated bifurcation in `NowPlayingView.svelte` so one template serves all viewports. The desktop full-screen design (blurred cover art, chevron-close, centered controls) becomes the only template, with responsive album art sizing. The queue button in now playing stops calling `onClose()` — the queue half-sheet layers above via existing AppShell z-index stacking (queue z-[60] > now playing z-50). The QueueDrawer mobile sheet height reduces from 70vh to 55vh.

**Tech Stack:** Svelte 5, Tailwind CSS 4, Vitest + @testing-library/svelte

---

### Task 1: Unify NowPlayingView template

**Files:**
- Modify: `src/lib/components/NowPlayingView.svelte`

- [ ] **Step 1: Remove `isDesktop` state and the `$effect` media query listener**

Delete lines 38-51:

```svelte
  let isDesktop = $state(
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(min-width: 768px)').matches
      : false
  );

  $effect(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const mq = window.matchMedia('(min-width: 768px)');
      const handler = (e: MediaQueryListEvent) => isDesktop = e.matches;
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  });
```

Delete: remove the entire `let isDesktop = $state(...)` block (lines 38-42) and the `$effect(...)` block (lines 44-51).

- [ ] **Step 2: Remove the mobile bottom sheet template**

Delete lines 111-261 (the entire `{#if !isDesktop}` block with its `<!-- Mobile bottom sheet -->` comment through the closing `{/if}`). Keep the desktop template intact.

- [ ] **Step 3: Remove the desktop `{#if isDesktop}` wrapper**

Remove the `{#if isDesktop}` on line 264 and its closing `{/if}` on line 409. The full-screen overlay template becomes unconditional.

- [ ] **Step 4: Make album art responsive**

Change the album art `<LazyImage>` class from:
```svelte
class="w-64 h-64 rounded-2xl object-cover shadow-2xl shadow-black/20 ring-1 ring-border/50"
```
to:
```svelte
class="w-48 h-48 md:w-64 md:h-64 rounded-2xl object-cover shadow-2xl shadow-black/20 ring-1 ring-border/50"
```

- [ ] **Step 5: Change queue button to not close now playing**

In the queue button (the one with `aria-label="Queue"` in the bottom action row), change:
```svelte
onclick={() => { onClose(); queueDrawerOpen.set(true); }}
```
to:
```svelte
onclick={() => { queueDrawerOpen.set(true); }}
```

- [ ] **Step 6: Adjust close button responsive padding for mobile**

Change the close button classes from:
```svelte
class="p-4 self-start rounded-xl ..."
```
to:
```svelte
class="p-3 md:p-4 self-start rounded-xl ..."
```

- [ ] **Step 7: Verify the file compiles**

Run: `pnpm typecheck`
Expected: 0 errors, 0 warnings

- [ ] **Step 8: Commit**

```bash
git add src/lib/components/NowPlayingView.svelte
git commit -m "feat: unify NowPlayingView into single responsive full-screen template"
```

---

### Task 2: Update NowPlayingView test mocks

**Files:**
- Modify: `tests/lib/components/NowPlayingView.test.ts`

- [ ] **Step 1: Add `queueDrawerOpen` mock export**

The queue button now calls `queueDrawerOpen.set(true)`. In the `vi.mock("$lib/stores/queue", ...)` block, add:

```ts
vi.mock("$lib/stores/queue", () => ({
  queue: {
    subscribe: vi.fn(() => vi.fn()),
    getPrevious: vi.fn(() => null),
    getNextAutoDJ: vi.fn(() => Promise.resolve(null)),
  },
  queueDrawerOpen: {
    subscribe: vi.fn(() => vi.fn()),
    set: vi.fn(),
  },
}));
```

- [ ] **Step 2: Run tests to confirm they pass**

Run: `pnpm test -- tests/lib/components/NowPlayingView.test.ts`
Expected: all 8 tests pass

- [ ] **Step 3: Add test for queue button opening queue without closing now playing**

Add a new test after line 220 (after the "calls onClose when album link is clicked" test):

```ts
it("queue button opens queue without closing now playing", async () => {
  const onClose = vi.fn();
  mockPlayerState.status = "playing";
  mockPlayerState.currentTrack = {
    title: "Test Song",
    artist: "Test Artist",
    album: "Test Album",
    coverArt: "123",
    artistId: "art1",
    albumId: "alb1",
  };
  render(NowPlayingView, { onClose });
  const queueButton = screen.getByLabelText("Queue");
  await fireEvent.click(queueButton);
  expect(onClose).not.toHaveBeenCalled();
});
```

- [ ] **Step 4: Run tests to confirm new test passes**

Run: `pnpm test -- tests/lib/components/NowPlayingView.test.ts`
Expected: 9 tests pass (1 new)

- [ ] **Step 5: Run full test suite**

Run: `pnpm test`
Expected: all 259+ tests pass

- [ ] **Step 6: Commit**

```bash
git add tests/lib/components/NowPlayingView.test.ts
git commit -m "test: add queueDrawerOpen mock and queue-button-doesnt-close-now-playing test"
```

---

### Task 3: Reduce mobile queue sheet height

**Files:**
- Modify: `src/lib/components/QueueDrawer.svelte`

- [ ] **Step 1: Change max-height on mobile queue sheet**

In the mobile bottom sheet `<div>` (the one with `class="relative w-full max-w-lg bg-surface ... max-h-[70vh] ..."`), change:
```
max-h-[70vh]
```
to:
```
max-h-[55vh]
```

This makes the queue half-sheet only cover the bottom 55% of the viewport, leaving the now playing visible above it.

- [ ] **Step 2: Verify typecheck and tests pass**

Run: `pnpm typecheck && pnpm test`
Expected: 0 type errors, all 260 tests pass

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/QueueDrawer.svelte
git commit -m "feat: reduce mobile queue sheet to half-height overlay"
```

---

### Task 4: Final verification

- [ ] **Step 1: Run full lint**

Run: `pnpm lint`
Expected: only pre-existing ESLint errors in test files (8 errors in player.test.ts and AutoDJ.test.ts)

- [ ] **Step 2: Run full typecheck**

Run: `pnpm typecheck`
Expected: 0 errors, 0 warnings

- [ ] **Step 3: Run full test suite**

Run: `pnpm test`
Expected: 260 tests pass (28 files), 0 failures

- [ ] **Step 4: Run production build**

Run: `pnpm build`
Expected: successful build, no errors
