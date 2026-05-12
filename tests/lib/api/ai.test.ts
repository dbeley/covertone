import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildContextPrompt, fetchSongContext } from "$lib/api/ai";
import type { SongInfo } from "$lib/api/ai";

const fullSong: SongInfo = {
  title: "Song Title",
  artist: "Artist Name",
  album: "Album Name",
  year: 1994,
  genre: "Alternative",
  track: 3,
  discNumber: 1,
  duration: 245,
  songwriters: "Songwriter A",
  producers: "Producer B",
  chartInfo: "Peaked at #5 on Billboard",
  specialNotes: "Recorded live in one take",
};

const minimalSong: SongInfo = {
  title: "Minimal",
  artist: "Minimalist",
  duration: 120,
};

describe("buildContextPrompt", () => {
  it("includes all available fields", () => {
    const prompt = buildContextPrompt(fullSong);
    expect(prompt).toContain("[Title: Song Title]");
    expect(prompt).toContain("[Artist: Artist Name]");
    expect(prompt).toContain("[Album: Album Name]");
    expect(prompt).toContain("[Year: 1994]");
    expect(prompt).toContain("[Genre (optional): Alternative]");
    expect(prompt).toContain("[Songwriters/Producers (optional): Songwriter A / Producer B]");
    expect(prompt).toContain("[Chart/Award/Streams (optional): Peaked at #5 on Billboard]");
    expect(prompt).toContain("[Special notes/questions (optional): Recorded live in one take]");
  });

  it("includes only present fields", () => {
    const prompt = buildContextPrompt(minimalSong);
    expect(prompt).toContain("[Title: Minimal]");
    expect(prompt).toContain("[Artist: Minimalist]");
    expect(prompt).not.toContain("[Album:");
    expect(prompt).not.toContain("[Year:");
    expect(prompt).not.toContain("[Genre");
    expect(prompt).not.toContain("[Songwriters/Producers");
    expect(prompt).not.toContain("[Chart/Award");
    expect(prompt).not.toContain("[Special notes");
  });

  it("combines songwriters and producers with separator", () => {
    const song: SongInfo = { ...minimalSong, songwriters: "A", producers: "B" };
    const prompt = buildContextPrompt(song);
    expect(prompt).toContain("[Songwriters/Producers (optional): A / B]");
  });

  it("handles only songwriters without producers", () => {
    const song: SongInfo = { ...minimalSong, songwriters: "Solo Writer" };
    const prompt = buildContextPrompt(song);
    expect(prompt).toContain("[Songwriters/Producers (optional): Solo Writer]");
  });
});

describe("fetchSongContext", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;
  });

  it("returns content from API response", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "This is an interesting paragraph about the song." } }],
        }),
    });

    const result = await fetchSongContext("https://api.example.com", "sk-test", "test-model", fullSong);
    expect(result).toBe("This is an interesting paragraph about the song.");
  });

  it("sends correct request format", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "ok" } }],
        }),
    });

    await fetchSongContext("https://api.example.com/v1", "sk-key", "deepseek-chat", minimalSong);

    const call = fetchSpy.mock.calls[0];
    expect(call[0]).toBe("https://api.example.com/v1/chat/completions");
    expect(call[1].method).toBe("POST");
    expect(call[1].headers["Authorization"]).toBe("Bearer sk-key");
    expect(call[1].headers["Content-Type"]).toBe("application/json");

    const body = JSON.parse(call[1].body);
    expect(body.model).toBe("deepseek-chat");
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[1].role).toBe("user");
    expect(body.max_tokens).toBe(1200);
  });

  it("strips trailing slash from endpoint", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "ok" } }],
        }),
    });

    await fetchSongContext("https://api.example.com/", "sk-key", "model", minimalSong);
    expect(fetchSpy.mock.calls[0][0]).toBe("https://api.example.com/chat/completions");
  });

  it("throws on non-ok response with error message", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () =>
        Promise.resolve({
          error: { message: "Invalid API key" },
        }),
    });

    await expect(fetchSongContext("https://api.example.com", "bad-key", "model", minimalSong)).rejects.toThrow(
      "Invalid API key",
    );
  });

  it("throws generic error on non-ok response without error body", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("parse failed")),
    });

    await expect(fetchSongContext("https://api.example.com", "key", "model", minimalSong)).rejects.toThrow(
      "AI API error: 500",
    );
  });

  it("handles missing choices gracefully", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    const result = await fetchSongContext("https://api.example.com", "key", "model", minimalSong);
    expect(result).toBe("");
  });
});
