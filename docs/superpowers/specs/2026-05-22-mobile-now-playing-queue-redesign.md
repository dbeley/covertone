# Mobile Now Playing + Queue Redesign

## Goal

Make the mobile now playing experience feel like a proper screen (not a popup/bottom sheet), matching the desktop full-screen design. Make the queue open as a half-sheet layered on top of the now playing screen, rather than closing now playing and opening a separate queue bottom sheet.

## Current State

- **Desktop**: Now playing is a full-screen overlay with blurred cover art background. Queue is a sidebar panel.
- **Mobile**: Now playing is a bottom sheet popup. Queue is a separate full-screen bottom sheet. The queue button in now playing **closes** now playing before opening the queue.
- `NowPlayingView.svelte` has two completely separate templates gated by `isDesktop` media query match.

## Design

### 1. Unified NowPlayingView template

Remove the `isDesktop`/`!isDesktop` bifurcation. Use a single responsive template based on the current desktop full-screen design:

- Full-screen overlay with blurred cover art background (`fixed inset-0 z-50 bg-bg/95 backdrop-blur-xl`)
- Close button (chevron down) in top-left
- Large album art, centered controls
- On mobile: album art scales to `w-48 h-48`, spacing tweaks for smaller viewport
- Swipe-down to dismiss (existing gesture, works on both)

### 2. Queue half-sheet over now playing (mobile)

On mobile, tapping the queue button in now playing **no longer calls `onClose()`**. Instead, it just sets `queueDrawerOpen.set(true)`. The queue slides up as a half-sheet with a semi-transparent backdrop — the now playing stays visible behind it.

QueueDrawer component changes for mobile:
- Half-height: `max-h-[55vh]` instead of the current `max-h-[70vh]`
- Semi-transparent backdrop: user sees the now playing screen behind the queue
- Closing the queue (backdrop tap, X button, swipe-down) returns to now playing — does NOT close now playing
- Z-index: `z-[60]` (unchanged, already above now playing's `z-50`)

### 3. Behavior summary

| Trigger | Mobile | Desktop |
|---|---|---|
| Tap NowPlayingBar | Opens now playing full-screen | Opens now playing full-screen |
| Tap queue button in now playing | Opens queue half-sheet on top of now playing | Opens queue in sidebar |
| Close queue | Returns to now playing (if open) or main app | Sidebar slides closed |
| Close now playing | Returns to main app | Returns to main app |
| Android back from queue | Closes queue only | N/A |
| Android back from now playing | Closes now playing | N/A |

## Component Changes

| Component | Changes |
|---|---|
| `NowPlayingView.svelte` | Remove `isDesktop` state + `$effect` media query listener; remove `{#if isDesktop}` / `{#if !isDesktop}` branches; use unified template; queue button stops calling `onClose()` on mobile; responsive album art sizing |
| `QueueDrawer.svelte` | Mobile sheet: `max-h-[70vh]` → `max-h-[55vh]`; ensure backdrop is semi-transparent so now playing shows through |
| `AppShell.svelte` | No changes (existing z-index stack: NowPlaying z-50, Queue z-[60]) |
| `App.svelte` | No changes (Android back button already handles both `nowPlayingOpen` and `queueDrawerOpen`) |

## Stores

No store changes. `nowPlayingOpen` and `queueDrawerOpen` retain existing semantics.

## Testing

- NowPlayingView renders on mobile viewport with unified template
- Close button and swipe-down dismiss now playing on both mobile and desktop
- Queue half-sheet opens on mobile without closing now playing
- Queue close (backdrop, X, swipe) returns to now playing when it's underneath
- Desktop now playing and queue sidebar work as before
- Existing QueueDrawer tests (7) and NowPlayingView tests (8) pass
