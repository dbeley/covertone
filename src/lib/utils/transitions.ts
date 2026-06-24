import { fly, scale, type TransitionConfig } from "svelte/transition";
import { quintOut } from "svelte/easing";

/**
 * Reusable transition presets for Covertone UI.
 */

export function pageSlide(
  _node: Element,
  params: { direction?: "left" | "right" } = {},
): TransitionConfig {
  const x = params.direction === "right" ? 20 : -20;
  return {
    duration: 200,
    easing: quintOut,
    ...fly(_node, { x, opacity: 0 }),
  };
}

export function drawerSlide(
  _node: Element,
  _params: unknown = {},
): TransitionConfig {
  return {
    duration: 250,
    easing: quintOut,
    ...fly(_node, { y: "100%", opacity: 0 }),
  };
}

export function fadeIn(
  _node: Element,
  _params: unknown = {},
): TransitionConfig {
  return {
    duration: 150,
    ...fly(_node, { y: 8, opacity: 0 }),
  };
}

export function scaleIn(
  _node: Element,
  _params: unknown = {},
): TransitionConfig {
  return {
    duration: 150,
    easing: quintOut,
    ...scale(_node, { start: 0.95, opacity: 0 }),
  };
}
