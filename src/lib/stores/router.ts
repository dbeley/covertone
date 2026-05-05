import { writable } from "svelte/store";

export interface Route {
  path: string;
  params: Record<string, string>;
  matches: (pattern: string) => boolean;
  extractParams: (pattern: string) => Record<string, string>;
}

function parseRoute(hash: string): Route {
  let path = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!path) path = "/";
  if (!path.startsWith("/")) path = "/" + path;

  function doMatch(pattern: string): { matched: boolean; params: Record<string, string> } {
    const patternParts = pattern.split("/").filter(Boolean);
    const rawParts = path.split("/").filter(Boolean);
    const pathParts = rawParts.map(decodeURIComponent);
    if (patternParts.length !== pathParts.length) {
      return { matched: false, params: {} };
    }
    const extracted: Record<string, string> = {};
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(":")) {
        extracted[patternParts[i].slice(1)] = pathParts[i];
        continue;
      }
      if (patternParts[i] !== pathParts[i]) {
        return { matched: false, params: {} };
      }
    }
    return { matched: true, params: extracted };
  }

  return {
    path,
    get params(): Record<string, string> {
      return {};
    },
    matches(pattern: string): boolean {
      return doMatch(pattern).matched;
    },
    extractParams(pattern: string): Record<string, string> {
      return doMatch(pattern).params;
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
      const encoded = path.split("/").map(encodeURIComponent).join("/");
      window.location.hash = "#" + encoded;
    },
  };
}

export const router = createRouter();
