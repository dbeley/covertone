<script lang="ts">
  import { player } from '$lib/stores/player';
  import { settings } from '$lib/stores/settings';
  import { SubsonicAPI, getCoverArtUrl } from '$lib/api/SubsonicAPI';
  import type { Song } from '$lib/api/types';

  let serverUrl = $derived($settings.serverUrl);
  let username = $derived($settings.username);
  let password = $derived($settings.password);
  let configured = $derived($settings.isConfigured);

  let gameStarted = $state(false);
  let currentSong = $state<Song | null>(null);
  let options = $state<string[]>([]);
  let correctArtist = $state('');
  let guessed = $state(false);
  let correctGuess = $state(false);
  let score = $state(0);
  let round = $state(0);
  let loading = $state(false);
  let error = $state('');

  let allSongData = $state<Song[]>([]);
  let guessedArtist = $state('');

  function coverUrl(song: Song): string {
    if (!song.coverArt) return '';
    return getCoverArtUrl({ server: serverUrl, username, password, id: song.coverArt, size: 192 });
  }

  async function startGame() {
    score = 0;
    round = 0;
    gameStarted = true;
    await nextRound();
  }

  async function nextRound() {
    guessed = false;
    correctGuess = false;
    guessedArtist = '';
    loading = true;
    error = '';

    try {
      const api = new SubsonicAPI({ server: serverUrl, username, password }, 10000);
      const result = await api.getRandomSongs({ size: 4 });

      if (!result.randomSongs?.song || result.randomSongs.song.length < 2) {
        error = 'Not enough songs found. Try again.';
        loading = false;
        return;
      }

      allSongData = result.randomSongs.song;
      currentSong = allSongData[0];
      correctArtist = currentSong.artist;

      const artistOptions: string[] = [];
      artistOptions.push(correctArtist);

      for (let i = 1; i < allSongData.length && artistOptions.length < 4; i++) {
        if (!artistOptions.includes(allSongData[i].artist)) {
          artistOptions.push(allSongData[i].artist);
        }
      }

      const fallbacks = ['Radiohead', 'The Beatles', 'Miles Davis', 'John Coltrane', 'Aphex Twin', 'Kraftwerk', 'Bjork', 'Pink Floyd'];
      while (artistOptions.length < 4) {
        const fb = fallbacks.find(f => !artistOptions.includes(f));
        if (fb) artistOptions.push(fb);
        else break;
      }

      options = artistOptions.sort(() => Math.random() - 0.5);
      round++;

      if (currentSong) {
        player.playTrack(currentSong);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      error = e instanceof DOMException && e.name === 'AbortError'
        ? `Request timed out. Check if "${serverUrl}" is reachable.`
        : msg;
    }

    loading = false;
  }

  function guess(artist: string) {
    if (guessed) return;
    guessed = true;
    guessedArtist = artist;

    if (artist === correctArtist) {
      correctGuess = true;
      score += 10;
    }
  }

  function endGame() {
    gameStarted = false;
    currentSong = null;
    options = [];
    correctArtist = '';
    guessed = false;
    player.stop();
  }
</script>

<div class="p-6">
  <h2 class="text-2xl font-bold mb-6 tracking-tight">Game</h2>

  {#if !configured}
    <p class="text-text-dim">Configure server in Settings to play</p>
  {:else if !gameStarted}
    <div class="text-center py-20">
      <p class="text-lg mb-8 text-text-dim">Guess the artist from a random song</p>
      <button
        class="px-6 py-3 bg-accent text-white rounded-xl text-sm font-medium hover:brightness-110 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-accent/20"
        onclick={startGame}
      >
        Start Game
      </button>
    </div>
  {:else if loading}
    <p class="text-text-dim">Loading...</p>
  {:else if error}
    <p class="text-red-500 mb-4">{error}</p>
    <button
      class="px-4 py-2.5 bg-accent text-white rounded-xl text-sm font-medium hover:brightness-110 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-accent/20"
      onclick={nextRound}
    >
      Try Again
    </button>
  {:else if currentSong}
    <div class="text-center mb-4">
      <p class="text-xs text-text-dim uppercase tracking-widest font-medium">Round {round}</p>
      <p class="text-lg font-bold mt-1">Score: {score}</p>
    </div>

    <div class="flex flex-col items-center gap-4 mb-6">
      {#if currentSong.coverArt}
        <img
          src={coverUrl(currentSong)}
          alt=""
          loading="lazy" decoding="async" class="w-40 h-40 rounded-2xl object-cover shadow-xl shadow-black/10 ring-1 ring-border/50"
        />
      {/if}
      <p class="text-xs text-text-dim uppercase tracking-widest font-medium">Now Playing</p>
    </div>

    <div class="grid grid-cols-2 gap-3 mb-6">
      {#each options as artist (artist)}
        <button
          class="px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 border active:scale-[0.98]
                 {guessed
                   ? artist === correctArtist
                     ? 'bg-green-500/10 border-green-500/30 text-green-500'
                     : artist === guessedArtist
                       ? 'bg-red-500/10 border-red-500/30 text-red-500'
                       : 'bg-surface border-border text-text-dim'
                   : 'bg-surface border-border hover:border-accent/30 hover:shadow-sm text-text'}"
          onclick={() => guess(artist)}
          disabled={guessed}
        >
          {artist}
        </button>
      {/each}
    </div>

    {#if guessed}
      <div class="text-center mb-6">
        {#if correctGuess}
          <p class="text-green-500 font-bold text-lg">Correct! +10</p>
        {:else}
          <p class="text-red-500 font-bold">
            Wrong! The answer was <span class="text-accent">{correctArtist}</span>
          </p>
        {/if}
        <p class="text-sm text-text-dim mt-2">
          {currentSong.title} · {currentSong.album}
        </p>
      </div>

      <div class="flex justify-center gap-4">
        <button
          class="px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-medium hover:brightness-110 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-accent/20"
          onclick={nextRound}
        >
          Next
        </button>
        <button
          class="px-6 py-2.5 bg-surface border border-border rounded-xl text-sm font-medium text-text-dim hover:text-text hover:border-accent/30 active:scale-[0.98] transition-all duration-150"
          onclick={endGame}
        >
          End Game
        </button>
      </div>
    {/if}
  {/if}
</div>
