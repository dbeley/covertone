export function isActivationKey(event: KeyboardEvent): boolean {
  return event.key === "Enter" || event.key === " ";
}

export function handleActivationKey(
  event: KeyboardEvent,
  activate: () => void,
): void {
  if (!isActivationKey(event)) return;
  if (event.key === " ") event.preventDefault();
  activate();
}
