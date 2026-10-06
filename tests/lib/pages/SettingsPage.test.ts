import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import SettingsPage from "$lib/pages/SettingsPage.svelte";

const settingsMocks = vi.hoisted(() => ({
  setServerConfig: vi.fn(),
  setTheme: vi.fn(),
  setScrobbleEnabled: vi.fn(),
  setAiConfig: vi.fn(),
  setOfflineCacheEnabled: vi.fn(),
}));

const initialState = {
  theme: "system" as const,
  appliedTheme: "light" as const,
  serverUrl: "",
  username: "",
  password: "",
  isConfigured: false,
  scrobbleEnabled: true,
  autoDJ: true,
  aiEndpoint: "https://api.deepseek.com",
  aiKey: "",
  aiModel: "deepseek-v4-flash",
  offlineCacheEnabled: false,
};

vi.mock("$lib/stores/settings", () => ({
  settings: {
    subscribe: (cb: (value: typeof initialState) => void) => {
      cb(initialState);
      return () => {};
    },
    setServerConfig: settingsMocks.setServerConfig,
    setTheme: settingsMocks.setTheme,
    setScrobbleEnabled: settingsMocks.setScrobbleEnabled,
    setAiConfig: settingsMocks.setAiConfig,
    setOfflineCacheEnabled: settingsMocks.setOfflineCacheEnabled,
  },
}));

vi.mock("$lib/api/SubsonicAPI", () => ({
  SubsonicAPI: vi.fn(function () {
    return { ping: vi.fn().mockResolvedValue(true) };
  }),
}));

describe("SettingsPage", () => {
  beforeEach(() => {
    settingsMocks.setServerConfig.mockClear();
    settingsMocks.setTheme.mockClear();
    settingsMocks.setScrobbleEnabled.mockClear();
    settingsMocks.setOfflineCacheEnabled.mockClear();
  });

  it("associates server labels with corresponding controls", () => {
    render(SettingsPage);
    const urlInput = screen.getByLabelText("URL") as HTMLInputElement;
    const usernameInput = screen.getByLabelText("Username") as HTMLInputElement;
    const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;
    expect(urlInput.id).toBe("settings-server-url");
    expect(usernameInput.id).toBe("settings-username");
    expect(passwordInput.id).toBe("settings-password");
  });

  it("saves server configuration with user-provided values", async () => {
    render(SettingsPage);
    await fireEvent.input(screen.getByLabelText("URL"), {
      target: { value: "https://demo.example.com" },
    });
    await fireEvent.input(screen.getByLabelText("Username"), {
      target: { value: "demo-user" },
    });
    await fireEvent.input(screen.getByLabelText("Password"), {
      target: { value: "demo-pass" },
    });
    const saveButtons = screen.getAllByRole("button", { name: "Save" });
    await fireEvent.click(saveButtons[0]);
    expect(settingsMocks.setServerConfig).toHaveBeenCalledWith({
      server: "https://demo.example.com",
      username: "demo-user",
      password: "demo-pass",
    });
  });

  it("toggles the offline cache setting", async () => {
    render(SettingsPage);
    const toggle = screen.getByRole("checkbox", {
      name: "Cache albums for offline listening",
    }) as HTMLInputElement;
    expect(toggle.checked).toBe(false);

    await fireEvent.click(toggle);

    expect(settingsMocks.setOfflineCacheEnabled).toHaveBeenCalledWith(true);
  });
});
