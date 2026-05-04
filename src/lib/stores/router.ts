import { writable } from "svelte/store";

export interface Route {
  path: string;
  params: Record<string, string>;
  matches: (pattern: string) => boolean;
}

function parseRoute(hash: string): Route {
  let path = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!path) path = "/";
  if (!path.startsWith("/")) path = "/" + path;

  const params: Record<string, string> = {};

  return {
    path,
    params,
    matches(pattern: string): boolean {
      const patternParts = pattern.split("/").filter(Boolean);
      const pathParts = path.split("/").filter(Boolean);
      if (patternParts.length !== pathParts.length) return false;
      const extracted: Record<string, string> = {};
      for (let i = 0; i < patternParts.length; i++) {
        if (patternParts[i].startsWith(":")) {
          extracted[patternParts[i].slice(1)] = pathParts[i];
          continue;
        }
        if (patternParts[i] !== pathParts[i]) return false;
      }
      Object.assign(params, extracted);
      this.params = params;
      return true;
    },
  };
}

function createRouter() {
  const getHash = () =>
    typeof window !== "undefined" ? window.location.hash : "";
  const { subscribe, set } = writable<Route>(parseRoute(getHash()));
  let cleanup: (() => void) | undefined;

  return {
    subscribe,
    reset() {
      if (cleanup) {
        cleanup();
        cleanup = undefined;
      }
      const route = parseRoute(getHash());
      set(route);
      if (typeof window !== "undefined") {
        const handler = () => set(parseRoute(getHash()));
        window.addEventListener("hashchange", handler);
        cleanup = () => window.removeEventListener("hashchange", handler);
      }
    },
    navigate(path: string) {
      window.location.hash = "#" + path;
    },
  };
}

export const router = createRouter();
