import { writable } from "svelte/store";

export type Theme = "system" | "light" | "dark" | "amoled";
export type AppliedTheme = "light" | "dark" | "amoled";

export interface SettingsState {
  theme: Theme;
  appliedTheme: AppliedTheme;
  serverUrl: string;
  username: string;
  password: string;
  isConfigured: boolean;
  scrobbleEnabled: boolean;
  autoDJ: boolean;
}

const STORAGE_KEY = "covertone-settings";

function resolveAppliedTheme(theme: Theme): AppliedTheme {
  if (theme === "system") {
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }
    return "light";
  }
  return theme as AppliedTheme;
}

function loadPersisted(): Partial<SettingsState> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    /* ignore */
  }
  return {};
}

function persist(state: Partial<SettingsState>): void {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...existing, ...state }),
    );
  } catch {
    /* ignore */
  }
}

function createSettings() {
  const persisted = loadPersisted();
  const theme = (persisted.theme as Theme) ?? "system";

  const { subscribe, set, update } = writable<SettingsState>({
    theme,
    appliedTheme: resolveAppliedTheme(theme),
    serverUrl: persisted.serverUrl ?? "",
    username: persisted.username ?? "",
    password: persisted.password ?? "",
    isConfigured: !!(persisted.serverUrl && persisted.username),
    scrobbleEnabled: persisted.scrobbleEnabled ?? true,
    autoDJ: persisted.autoDJ ?? true,
  });

  return {
    subscribe,
    setTheme(theme: Theme) {
      update((state) => {
        const next = {
          ...state,
          theme,
          appliedTheme: resolveAppliedTheme(theme),
        };
        persist({ theme });
        return next;
      });
    },
    setScrobbleEnabled(enabled: boolean) {
      update((state) => {
        const next = { ...state, scrobbleEnabled: enabled };
        persist({ scrobbleEnabled: enabled });
        return next;
      });
    },
    setAutoDJ(enabled: boolean) {
      update((state) => {
        const next = { ...state, autoDJ: enabled };
        persist({ autoDJ: enabled });
        return next;
      });
    },
    setServerConfig(config: {
      server: string;
      username: string;
      password: string;
    }) {
      update((state) => {
        const next = {
          ...state,
          serverUrl: config.server,
          username: config.username,
          password: config.password,
          isConfigured: !!(config.server && config.username),
        };
        persist({
          serverUrl: config.server,
          username: config.username,
          password: config.password,
        });
        return next;
      });
    },
    reset() {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      set({
        theme: "system",
        appliedTheme: resolveAppliedTheme("system"),
        serverUrl: "",
        username: "",
        password: "",
        isConfigured: false,
        scrobbleEnabled: true,
        autoDJ: true,
      });
    },
    reload() {
      const persisted = loadPersisted();
      const theme = (persisted.theme as Theme) ?? "system";
      set({
        theme,
        appliedTheme: resolveAppliedTheme(theme),
        serverUrl: persisted.serverUrl ?? "",
        username: persisted.username ?? "",
        password: persisted.password ?? "",
        isConfigured: !!(persisted.serverUrl && persisted.username),
        scrobbleEnabled: persisted.scrobbleEnabled ?? true,
        autoDJ: persisted.autoDJ ?? true,
      });
    },
  };
}

export const settings = createSettings();
