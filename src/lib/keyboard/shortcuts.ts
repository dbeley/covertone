import { writable, get } from "svelte/store";
import { player } from "$lib/stores/player";
import { router } from "$lib/stores/router";
import { nowPlayingOpen, shortcutsModalOpen } from "$lib/stores/ui";
import { queueDrawerOpen } from "$lib/stores/queue";
import { discoveryDrawerOpen } from "$lib/stores/discovery";
import { library } from "$lib/stores/library";

export const focusedIndex = writable(-1);

const VOLUME_STEP = 0.05;
const SEEK_STEP = 10;

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;

  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") {
    return true;
  }

  const editable = (el as HTMLElement).getAttribute("contenteditable");
  if (editable === "true" || editable === "") {
    return true;
  }

  return false;
}

function getNavigableElements(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      'button:not([tabindex="-1"]), [role="button"][tabindex="0"]:not([data-nav-ignore])',
    ),
  ).filter((el) => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
}

function getRowStep(currentIdx: number): number {
  const elements = getNavigableElements();
  if (elements.length < 2 || currentIdx < 0 || currentIdx >= elements.length)
    return 1;

  const currentTop = elements[currentIdx].getBoundingClientRect().top;
  let count = 1;

  for (let i = currentIdx + 1; i < elements.length; i++) {
    const top = elements[i].getBoundingClientRect().top;
    if (Math.abs(top - currentTop) > 2) break;
    count++;
  }

  for (let i = currentIdx - 1; i >= 0; i--) {
    const top = elements[i].getBoundingClientRect().top;
    if (Math.abs(top - currentTop) > 2) break;
    count++;
  }

  return count;
}

function moveFocus(delta: number) {
  const elements = getNavigableElements();
  if (elements.length === 0) return;

  const current = get(focusedIndex);
  let next = current + delta;

  if (next < 0) next = 0;
  if (next >= elements.length) next = elements.length - 1;

  focusedIndex.set(next);
  elements[next].focus();
}

function activateFocused() {
  const idx = get(focusedIndex);
  if (idx < 0) return;
  const elements = getNavigableElements();
  if (idx >= elements.length) return;

  const el = elements[idx];
  el.click();
}

function toggleFavorite() {
  const ps = get(player);
  if (!ps.currentTrack) return;
  const next = !ps.favorited;
  player.setFavorited(next);
  const api = library.getApi();
  if (!api) return;
  if (next) api.star({ id: ps.currentTrack.id });
  else api.unstar({ id: ps.currentTrack.id });
}

function handleKeyDown(e: KeyboardEvent) {
  if (isTypingTarget(e.target)) return;

  const key = e.key;
  const shift = e.shiftKey;

  if (shift) {
    switch (key) {
      case "H":
        e.preventDefault();
        history.back();
        break;
      case "L":
        e.preventDefault();
        history.forward();
        break;
      case ",":
      case "<":
        e.preventDefault();
        player.handlePreviousTrack();
        break;
      case ".":
      case ">":
        e.preventDefault();
        import("$lib/stores/queue").then(async ({ queue }) => {
          const next = await queue.getNextAutoDJ();
          if (next) player.playTrack(next);
        });
        break;
      case "F":
        e.preventDefault();
        toggleFavorite();
        break;
    }
    return;
  }

  switch (key) {
    case " ":
      e.preventDefault();
      e.stopPropagation();
      player.togglePlay();
      break;
    case "s":
      e.preventDefault();
      player.setShuffle(!get(player).shuffle);
      break;
    case "r":
      e.preventDefault();
      player.setRepeating(!get(player).repeating);
      break;
    case "b":
      e.preventDefault();
      player.seek(Math.max(0, get(player).currentTime - SEEK_STEP));
      break;
    case "f":
      e.preventDefault();
      player.seek(
        Math.min(get(player).duration, get(player).currentTime + SEEK_STEP),
      );
      break;
    case "m":
      e.preventDefault();
      player.setVolume(get(player).volume > 0 ? 0 : 1);
      break;
    case "h":
      e.preventDefault();
      moveFocus(-1);
      break;
    case "l":
      e.preventDefault();
      moveFocus(1);
      break;
    case "j":
      e.preventDefault();
      moveFocus(getRowStep(get(focusedIndex)));
      break;
    case "k":
      e.preventDefault();
      moveFocus(-getRowStep(get(focusedIndex)));
      break;
    case "Enter":
      e.preventDefault();
      activateFocused();
      break;
    case "v":
      e.preventDefault();
      nowPlayingOpen.set(true);
      break;
    case "q":
      e.preventDefault();
      queueDrawerOpen.update((v) => !v);
      break;
    case "/":
      e.preventDefault();
      router.navigate("/search");
      break;
    case "?":
      e.preventDefault();
      shortcutsModalOpen.update((v) => !v);
      break;
    case "Escape":
      if (get(nowPlayingOpen)) {
        nowPlayingOpen.set(false);
      } else if (get(queueDrawerOpen)) {
        queueDrawerOpen.set(false);
      } else if (get(discoveryDrawerOpen)) {
        discoveryDrawerOpen.set(false);
      } else if (get(shortcutsModalOpen)) {
        shortcutsModalOpen.set(false);
      } else {
        focusedIndex.set(-1);
        (document.activeElement as HTMLElement)?.blur();
      }
      break;
    case "1":
      e.preventDefault();
      router.navigate("/");
      break;
    case "2":
      e.preventDefault();
      router.navigate("/albums");
      break;
    case "3":
      e.preventDefault();
      router.navigate("/artists");
      break;
    case "4":
      e.preventDefault();
      router.navigate("/playlists");
      break;
    case "5":
      e.preventDefault();
      router.navigate("/favorites");
      break;
    case "6":
      e.preventDefault();
      router.navigate("/search");
      break;
    case "7":
      e.preventDefault();
      router.navigate("/game");
      break;
    case "8":
      e.preventDefault();
      router.navigate("/settings");
      break;
    case "+":
    case "=":
      e.preventDefault();
      player.setVolume(Math.min(1, get(player).volume + VOLUME_STEP));
      break;
    case "-":
      e.preventDefault();
      player.setVolume(Math.max(0, get(player).volume - VOLUME_STEP));
      break;
  }
}

export function initKeyboardShortcuts(): () => void {
  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}
