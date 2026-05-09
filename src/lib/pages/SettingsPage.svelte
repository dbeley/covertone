<script lang="ts">
  import { settings } from '$lib/stores/settings';
  import { player } from '$lib/stores/player';
  import { SubsonicAPI } from '$lib/api/SubsonicAPI';
  import { isNativeAvailable } from '$lib/player/NativeMedia';
  import type { Theme } from '$lib/stores/settings';

  let theme = $derived($settings.theme);

  let server = $state('');
  let username = $state('');
  let password = $state('');
  let connectionStatus = $state<'idle' | 'testing' | 'success' | 'error'>('idle');
  let saveStatus = $state<'idle' | 'saved'>('idle');

  $effect(() => {
    server = $settings.serverUrl;
    username = $settings.username;
    password = $settings.password;
  });

  const themes: { label: string; value: Theme }[] = [
    { label: 'System', value: 'system' },
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
    { label: 'AMOLED', value: 'amoled' },
  ];

  async function testConnection() {
    if (!server || !server.startsWith('http')) {
      connectionStatus = 'error';
      return;
    }
    connectionStatus = 'testing';
    try {
      const api = new SubsonicAPI({ server, username, password });
      const ok = await api.ping();
      connectionStatus = ok ? 'success' : 'error';
    } catch {
      connectionStatus = 'error';
    }
  }

  let currentTrack = $derived($player.currentTrack);
  let pageBottomPadding = $derived(
    currentTrack
      ? `calc(env(safe-area-inset-bottom, 0px) + 4rem)`
      : 'env(safe-area-inset-bottom, 0px)'
  );

  function saveConfig() {
    settings.setServerConfig({ server, username, password });
    saveStatus = 'saved';
    setTimeout(() => { saveStatus = 'idle'; }, 2000);
  }
</script>

<div class="p-6 max-w-lg" style="padding-bottom: {pageBottomPadding}">
  <h2 class="text-2xl font-bold mb-8 tracking-tight">Settings</h2>

  <section class="mb-8">
    <h3 class="text-lg font-semibold mb-4 tracking-tight">Server</h3>

    <div class="space-y-4">
      <div>
        <label for="settings-server-url" class="block text-sm font-medium text-text-dim mb-1.5">URL</label>
        <input
          id="settings-server-url"
          type="text"
          bind:value={server}
          placeholder="https://navidrome.example.com"
          class="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/30 transition-all duration-150"
        />
      </div>
      <div>
        <label for="settings-username" class="block text-sm font-medium text-text-dim mb-1.5">Username</label>
        <input
          id="settings-username"
          type="text"
          bind:value={username}
          placeholder="username"
          class="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/30 transition-all duration-150"
        />
      </div>
      <div>
        <label for="settings-password" class="block text-sm font-medium text-text-dim mb-1.5">Password</label>
        <input
          id="settings-password"
          type="password"
          bind:value={password}
          placeholder="password"
          class="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/30 transition-all duration-150"
        />
      </div>

      <div class="flex items-center gap-3">
        <button
          class="px-4 py-2.5 bg-surface border border-border rounded-xl text-sm font-medium hover:border-accent/30 hover:text-text active:scale-[0.98] transition-all duration-150 disabled:opacity-50"
          onclick={testConnection}
          disabled={connectionStatus === 'testing'}
        >
          {connectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}
        </button>
        {#if connectionStatus === 'success'}
          <span class="text-green-500 text-sm">Connected</span>
        {:else if connectionStatus === 'error'}
          <span class="text-red-500 text-sm">Connection failed</span>
        {/if}
      </div>

      <div class="flex items-center gap-3">
        <button
          class="px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-medium hover:brightness-110 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-accent/20"
          onclick={saveConfig}
        >
          Save
        </button>
        {#if saveStatus === 'saved'}
          <span class="text-green-500 text-sm">Saved</span>
        {/if}
      </div>
    </div>
  </section>

  <section class="mb-8">
    <h3 class="text-lg font-semibold mb-4 tracking-tight">Theme</h3>
    <div class="flex gap-2">
      {#each themes as t (t.value)}
        <button
          class="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 border border-border
                 {theme === t.value ? 'bg-accent text-white border-accent shadow-sm shadow-accent/20' : 'text-text-dim hover:text-text hover:border-accent/30'}"
          onclick={() => settings.setTheme(t.value)}
        >
          {t.label}
        </button>
      {/each}
    </div>
  </section>

  <section class="mb-8">
    <h3 class="text-lg font-semibold mb-4 tracking-tight">Playback</h3>
    <div class="flex items-center gap-3">
      <label class="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={$settings.scrobbleEnabled}
          onchange={(e) => settings.setScrobbleEnabled((e.target as HTMLInputElement).checked)}
          class="sr-only peer"
        />
        <div class="w-10 h-5 bg-surface border border-border rounded-full peer-checked:bg-accent peer-checked:border-accent transition-all duration-150 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full {!$settings.scrobbleEnabled ? 'opacity-60' : ''}">
        </div>
      </label>
      <span class="text-sm">Report plays to Navidrome (scrobbling)</span>
    </div>
    <div class="flex items-center gap-3 mt-4">
      <label class="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={$settings.autoDJ}
          onchange={(e) => settings.setAutoDJ((e.target as HTMLInputElement).checked)}
          class="sr-only peer"
        />
        <div class="w-10 h-5 bg-surface border border-border rounded-full peer-checked:bg-accent peer-checked:border-accent transition-all duration-150 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full {!$settings.autoDJ ? 'opacity-60' : ''}">
        </div>
      </label>
      <span class="text-sm">Auto-fill queue with similar songs when empty (Auto DJ)</span>
    </div>
  </section>

  {#if !isNativeAvailable()}
  <section class="mb-8">
    <h3 class="text-lg font-semibold mb-4 tracking-tight">Keyboard Shortcuts</h3>
    <div class="space-y-2 text-sm">
      <div class="flex justify-between items-center">
        <span class="text-text-dim">Play / Pause</span>
        <kbd class="px-2 py-0.5 bg-surface border border-border rounded-md text-xs font-mono text-text">Space</kbd>
      </div>
      <div class="flex justify-between items-center">
        <span class="text-text-dim">Search</span>
        <kbd class="px-2 py-0.5 bg-surface border border-border rounded-md text-xs font-mono text-text">Ctrl / ⌘ K</kbd>
      </div>
    </div>
  </section>
  {/if}

  <section>
    <h3 class="text-lg font-semibold mb-4 tracking-tight">About</h3>
    <p class="text-sm text-text-dim mb-2">Covertone v0.1.8 — A Subsonic/Navidrome music client</p>
    <a
      href="https://github.com/dbeley/covertone"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex items-center gap-2 text-sm text-text-dim hover:text-accent transition-colors"
    >
      <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
      </svg>
      GitHub
    </a>
  </section>
</div>
