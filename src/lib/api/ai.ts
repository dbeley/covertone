export interface SongInfo {
  title: string;
  artist: string;
  album?: string;
  year?: number;
  genre?: string;
  track?: number;
  discNumber?: number;
  duration: number;
  songwriters?: string;
  producers?: string;
  chartInfo?: string;
  specialNotes?: string;
}

export function buildContextPrompt(song: SongInfo): string {
  const lines: string[] = [];
  lines.push(`[Title: ${song.title}]`);
  lines.push(`[Artist: ${song.artist}]`);
  if (song.album) lines.push(`[Album: ${song.album}]`);
  if (song.year) lines.push(`[Year: ${song.year}]`);
  if (song.genre) lines.push(`[Genre (optional): ${song.genre}]`);
  if (song.songwriters || song.producers) {
    const credits = [song.songwriters, song.producers]
      .filter(Boolean)
      .join(" / ");
    lines.push(`[Songwriters/Producers (optional): ${credits}]`);
  }
  if (song.chartInfo)
    lines.push(`[Chart/Award/Streams (optional): ${song.chartInfo}]`);
  if (song.specialNotes)
    lines.push(`[Special notes/questions (optional): ${song.specialNotes}]`);

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
          content: `You are a knowledgeable music historian. Write one concise paragraph (3–5 sentences) that blends: (A) clear facts — song title, artist, album, release year, genre, and key credits (songwriter(s)/producer(s)) presented naturally, not as a list; (B) one-sentence summary of the song's musical character or lyrical theme using vivid language; (C) one notable data point — chart peak, award, or streaming milestone if available; (D) one interesting anecdote or backstory (recording, inspiration, first live performance, viral moment, controversy, sample/cover history); and (E) one short, surprising tidbit (production trick, guest musician, lyric interpretation, cultural impact, notable sync in film/TV). Vary sentence openings and phrasing across these elements so the paragraph doesn't always start with the artist and title. Keep tone lively and slightly conversational. Avoid formulaic patterns; use at least two different sentence structures. Use plain text only — no markdown, no bold, no italics, no formatting.

Exception: if the song has unusually rich or notable history (multiple strong anecdotes, cultural impact, awards, or production stories), expand to a short multi-paragraph entry (up to 6–8 sentences total) that keeps the same structure but adds 2–4 extra anecdotes or tidbits; otherwise keep it to 3–5 sentences.`,
        },
        {
          role: "user",
          content: buildContextPrompt(song),
        },
      ],
      temperature: 0.7,
      max_tokens: 1200,
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
