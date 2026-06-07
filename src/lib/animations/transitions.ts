import { fly } from "svelte/transition";
import { cubicOut } from "svelte/easing";

export const pageIn = (node: Element, { duration = 300 } = {}) => {
  return fly(node, {
    y: 12,
    duration,
    easing: cubicOut,
    opacity: 0,
  });
};
