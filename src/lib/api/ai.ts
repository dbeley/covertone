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
  const lines: string[] = ['Here is what I know about this song:'];
  lines.push(`- Title: ${song.title}`);
  lines.push(`- Artist: ${song.artist}`);
  if (song.album) lines.push(`- Album: ${song.album}`);
  if (song.year) lines.push(`- Year: ${song.year}`);
  if (song.genre) lines.push(`- Genre: ${song.genre}`);
  if (song.track) {
    const disc = song.discNumber ? ` on disc ${song.discNumber}` : '';
    lines.push(`- Track: ${song.track}${disc}`);
  }
  const minutes = Math.floor(song.duration / 60);
  const seconds = song.duration % 60;
  lines.push(`- Duration: ${minutes}:${seconds.toString().padStart(2, '0')}`);

  lines.push('');
  lines.push(
    'Please share interesting tidbits, anecdotes, hidden stories, or anything noteworthy about this song. What makes it interesting? Is there a backstory to its creation? Any fun facts about the recording process? What is the historical or cultural context? Keep it engaging and conversational — like you are telling a friend something cool about this song.'
  );

  return lines.join('\n');
}

export async function fetchSongContext(
  endpoint: string,
  apiKey: string,
  model: string,
  song: SongInfo
): Promise<string> {
  const baseUrl = endpoint.replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a knowledgeable music historian. Given information about a song, provide an interesting, conversational paragraph about it.',
        },
        {
          role: 'user',
          content: buildContextPrompt(song),
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
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
  return data.choices?.[0]?.message?.content ?? '';
}
