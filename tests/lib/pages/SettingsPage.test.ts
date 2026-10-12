import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import SettingsPage from "$lib/pages/SettingsPage.svelte";

const settingsMocks = vi.hoisted(() => ({
  setServerConfig: vi.fn(),
  setTheme: vi.fn(),
  setScrobbleEnabled: vi.fn(),
  setAiConfig: vi.fn(),
  setOfflineCacheEnabled: vi.fn(),
}));

const apiMocks = vi.hoisted(() => ({
  ping: vi.fn(() => Promise.resolve(true)),
  getScanStatus: vi.fn(),
  startScan: vi.fn(),
}));

const scanMocks = vi.hoisted(() => ({
  watchScan: vi.fn(() => () => {}),
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
    return {
      ping: apiMocks.ping,
      getScanStatus: apiMocks.getScanStatus,
      startScan: apiMocks.startScan,
    };
  }),
}));

vi.mock("$lib/library/scan", () => ({
  watchScan: scanMocks.watchScan,
}));

vi.mock("$lib/stores/apiCache", () => ({
  cacheInvalidate: vi.fn(),
}));

describe("SettingsPage", () => {
  beforeEach(() => {
    settingsMocks.setServerConfig.mockClear();
    settingsMocks.setTheme.mockClear();
    settingsMocks.setScrobbleEnabled.mockClear();
    settingsMocks.setOfflineCacheEnabled.mockClear();
    apiMocks.startScan.mockReset();
    apiMocks.getScanStatus.mockReset();
    scanMocks.watchScan.mockClear();
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

  it("triggers an incremental library scan", async () => {
    apiMocks.startScan.mockResolvedValue({
      scanStatus: { scanning: true, count: 0, scanType: "quick" },
    });
    apiMocks.getScanStatus.mockResolvedValue({
      scanStatus: { scanning: true, count: 5 },
    });
    render(SettingsPage);
    await fillServerFields();

    await fireEvent.click(screen.getByRole("button", { name: "Scan Library" }));

    expect(apiMocks.startScan).toHaveBeenCalledWith({ fullScan: false });
    expect(scanMocks.watchScan).toHaveBeenCalledTimes(1);
  });

  it("requests a full rescan when asked to", async () => {
    apiMocks.startScan.mockResolvedValue({
      scanStatus: { scanning: true, count: 0, scanType: "full" },
    });
    render(SettingsPage);
    await fillServerFields();

    await fireEvent.click(screen.getByRole("button", { name: "Full Scan" }));

    expect(apiMocks.startScan).toHaveBeenCalledWith({ fullScan: true });
  });

  it("disables the scan buttons while a scan is running", async () => {
    apiMocks.startScan.mockResolvedValue({
      scanStatus: { scanning: true, count: 0 },
    });
    render(SettingsPage);
    await fillServerFields();

    await fireEvent.click(screen.getByRole("button", { name: "Scan Library" }));

    const running = screen.getByRole("button", {
      name: "Scanning...",
    }) as HTMLButtonElement;
    const fullScan = screen.getByRole("button", {
      name: "Full Scan",
    }) as HTMLButtonElement;
    expect(running.disabled).toBe(true);
    expect(fullScan.disabled).toBe(true);
  });

  it("reports a failed scan", async () => {
    apiMocks.startScan.mockRejectedValue(new Error("HTTP 501: Not Implemented"));
    render(SettingsPage);
    await fillServerFields();

    await fireEvent.click(screen.getByRole("button", { name: "Scan Library" }));

    await waitFor(() =>
      expect(document.body.textContent).toContain("Scan failed"),
    );
    expect(document.body.textContent).toContain("HTTP 501");
    expect(scanMocks.watchScan).not.toHaveBeenCalled();
  });

  it("reports an error when scanning without a server URL", async () => {
    render(SettingsPage);

    await fireEvent.click(screen.getByRole("button", { name: "Scan Library" }));

    expect(apiMocks.startScan).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(document.body.textContent).toContain("no server configured"),
    );
  });

  it("loads the scan status on mount for a configured server", async () => {
    apiMocks.getScanStatus.mockResolvedValue({
      scanStatus: {
        scanning: false,
        count: 0,
        lastScan: "2026-10-12T18:31:00Z",
        folderCount: 3,
      },
    });
    initialState.serverUrl = "https://demo.example.com";
    try {
      render(SettingsPage);

      await waitFor(() => expect(apiMocks.getScanStatus).toHaveBeenCalled());
      await waitFor(() =>
        expect(document.body.textContent).toContain("3 folders"),
      );
    } finally {
      initialState.serverUrl = "";
    }
  });
});

async function fillServerFields() {
  await fireEvent.input(screen.getByLabelText("URL"), {
    target: { value: "https://demo.example.com" },
  });
  await fireEvent.input(screen.getByLabelText("Username"), {
    target: { value: "demo-user" },
  });
  await fireEvent.input(screen.getByLabelText("Password"), {
    target: { value: "demo-pass" },
  });
}
