import { describe, it, expect, beforeEach } from "vitest";
import { get } from "svelte/store";
import { settings } from "$lib/stores/settings";

describe("settings store", () => {
  beforeEach(() => {
    localStorage.clear();
    settings.reset();
  });

  it('has default theme "system"', () => {
    const state = get(settings);
    expect(state.theme).toBe("system");
  });

  it("has default AI config values", () => {
    const state = get(settings);
    expect(state.aiEndpoint).toBe("https://api.deepseek.com");
    expect(state.aiKey).toBe("");
    expect(state.aiModel).toBe("deepseek-v4-flash");
  });

  it("setAiConfig updates AI settings and persists", () => {
    settings.setAiConfig({
      endpoint: "https://custom.api.com",
      key: "sk-custom-key",
      model: "custom-model",
    });
    const state = get(settings);
    expect(state.aiEndpoint).toBe("https://custom.api.com");
    expect(state.aiKey).toBe("sk-custom-key");
    expect(state.aiModel).toBe("custom-model");
    expect(localStorage.getItem("covertone-settings")).toContain(
      '"aiModel":"custom-model"',
    );
  });

  it("persists AI config across reload", () => {
    settings.setAiConfig({
      endpoint: "https://persist.test",
      key: "sk-persist",
      model: "persist-model",
    });
    settings.reload();
    const state = get(settings);
    expect(state.aiEndpoint).toBe("https://persist.test");
    expect(state.aiKey).toBe("sk-persist");
    expect(state.aiModel).toBe("persist-model");
  });

  it("reset restores AI defaults", () => {
    settings.setAiConfig({
      endpoint: "https://custom.api.com",
      key: "sk-key",
      model: "custom-model",
    });
    settings.reset();
    const state = get(settings);
    expect(state.aiEndpoint).toBe("https://api.deepseek.com");
    expect(state.aiKey).toBe("");
    expect(state.aiModel).toBe("deepseek-v4-flash");
  });

  it("setTheme updates theme and persists to localStorage", () => {
    settings.setTheme("dark");
    const state = get(settings);
    expect(state.theme).toBe("dark");
    expect(localStorage.getItem("covertone-settings")).toContain(
      '"theme":"dark"',
    );
  });

  it("loads persisted settings from localStorage", () => {
    localStorage.setItem(
      "covertone-settings",
      JSON.stringify({ theme: "amoled" }),
    );
    settings.reload();
    const state = get(settings);
    expect(state.theme).toBe("amoled");
  });

  it("reset restores to defaults", () => {
    settings.setTheme("dark");
    settings.reset();
    const state = get(settings);
    expect(state.theme).toBe("system");
  });

  it('appliedTheme returns "dark" when theme is dark', () => {
    settings.setTheme("dark");
    const state = get(settings);
    expect(state.appliedTheme).toBe("dark");
  });

  it("persists and loads server config", () => {
    settings.setServerConfig({
      server: "https://navidrome.example.com",
      username: "user",
      password: "pass",
    });
    const state = get(settings);
    expect(state.serverUrl).toBe("https://navidrome.example.com");
    expect(state.username).toBe("user");
    expect(state.password).toBe("pass");
    expect(state.isConfigured).toBe(true);

    settings.reload();
    const loaded = get(settings);
    expect(loaded.serverUrl).toBe("https://navidrome.example.com");
    expect(loaded.username).toBe("user");
  });

  it("isConfigured returns false when no server URL", () => {
    const state = get(settings);
    expect(state.isConfigured).toBe(false);
  });
});
