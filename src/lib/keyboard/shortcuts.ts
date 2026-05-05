import { player } from "$lib/stores/player";

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

function handleKeyDown(e: KeyboardEvent) {
  if (isTypingTarget(e.target)) return;

  switch (e.code) {
    case "Space":
      e.preventDefault();
      player.togglePlay();
      break;
    case "ArrowRight":
      // Future: next track
      break;
    case "ArrowLeft":
      // Future: previous track
      break;
  }
}

export function initKeyboardShortcuts(): () => void {
  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}
