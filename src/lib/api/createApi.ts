import { SubsonicAPI, type SubsonicAPIConfig } from "$lib/api/SubsonicAPI";
import { get } from "svelte/store";
import { settings } from "$lib/stores/settings";

/**
 * Create a SubsonicAPI instance from the current settings.
 * Returns null if the server is not configured.
 */
export function createApiFromSettings(): SubsonicAPI | null {
  const s = get(settings);
  if (!s.isConfigured) return null;
  return new SubsonicAPI({
    server: s.serverUrl,
    username: s.username,
    password: s.password,
    clientName: "covertone",
  });
}

/**
 * Create a SubsonicAPI instance with explicit config.
 */
export function createApi(config: SubsonicAPIConfig): SubsonicAPI {
  return new SubsonicAPI(config);
}
