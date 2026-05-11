export interface SongInfo {
  title: string;
  artist: string;
  album?: string;
  year?: number;
  genre?: string;
  track?: number;
  discNumber?: number;
  duration: number;
}

export function buildContextPrompt(song: SongInfo): string {
  const lines: string[] = ["Here is the song info:"];
  lines.push(`[Title: ${song.title}]`);
  lines.push(`[Artist: ${song.artist}]`);
  if (song.album) lines.push(`[Album: ${song.album}]`);
  if (song.year) lines.push(`[Year: ${song.year}]`);
  if (song.genre) lines.push(`[Genre: ${song.genre}]`);
  if (song.track) {
    const disc = song.discNumber ? ` on disc ${song.discNumber}` : "";
    lines.push(`[Track: ${song.track}${disc}]`);
  }
  const minutes = Math.floor(song.duration / 60);
  const seconds = song.duration % 60;
  lines.push(`[Duration: ${minutes}:${seconds.toString().padStart(2, "0")}]`);

  return lines.join("\n");
}

export async function fetchSongContext(
  endpoint: string,
  apiKey: string,
  model: string,
  song: SongInfo,
): Promise<string> {
  const baseUrl = endpoint.replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a knowledgeable music historian. Write a single concise paragraph (3–5 sentences) that combines: 1) essential facts — song title, artist, album, release year, genre, songwriters/producers if known; 2) notable chart performance or awards (brief); 3) one or two interesting anecdotes or backstory (recording, inspiration, samples, controversies, live performance moments); and 4) one or two little-known tidbits (lyrics meaning, production tricks, guest musicians, cultural impact). Keep tone informative and engaging.",
        },
        {
          role: "user",
          content: buildContextPrompt(song),
        },
      ],
      temperature: 0.7,
      max_tokens: 800,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    let message = `AI API error: ${response.status}`;
    try {
      const body = await response.json();
      if (body.error?.message) message = body.error.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}
