<script lang="ts">
  import { settings } from '$lib/stores/settings';
  import { SubsonicAPI } from '$lib/api/SubsonicAPI';
  import type { Theme } from '$lib/stores/settings';

  let theme = $derived($settings.theme);

  let server = $state('');
  let username = $state('');
  let password = $state('');
  let connectionStatus = $state<'idle' | 'testing' | 'success' | 'error'>('idle');

  $effect(() => {
    server = $settings.serverUrl;
    username = $settings.username;
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

  function saveConfig() {
    settings.setServerConfig({ server, username, password });
  }
</script>

<div class="p-6 max-w-lg">
  <h2 class="text-2xl font-bold mb-6">Settings</h2>

  <section class="mb-8">
    <h3 class="text-lg font-semibold mb-4">Server</h3>

    <div class="space-y-3">
      <div>
        <label class="block text-sm text-text-dim mb-1">URL</label>
        <input
          type="text"
          bind:value={server}
          placeholder="https://navidrome.example.com"
          class="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-sm focus:outline-none focus:border-accent transition-colors"
        />
      </div>
      <div>
        <label class="block text-sm text-text-dim mb-1">Username</label>
        <input
          type="text"
          bind:value={username}
          placeholder="username"
          class="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-sm focus:outline-none focus:border-accent transition-colors"
        />
      </div>
      <div>
        <label class="block text-sm text-text-dim mb-1">Password</label>
        <input
          type="password"
          bind:value={password}
          placeholder="password"
          class="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-sm focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      <div class="flex items-center gap-3">
        <button
          class="px-4 py-2 bg-surface border border-white/10 text-sm rounded-lg hover:border-accent transition-colors disabled:opacity-50"
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

      <button
        class="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        onclick={saveConfig}
      >
        Save
      </button>
    </div>
  </section>

  <section class="mb-8">
    <h3 class="text-lg font-semibold mb-4">Theme</h3>
    <div class="flex gap-2">
      {#each themes as t}
        <button
          class="px-4 py-2 rounded-full text-sm font-medium transition-colors
                 {theme === t.value ? 'bg-accent text-white' : 'text-text-dim hover:text-text'}"
          onclick={() => settings.setTheme(t.value)}
        >
          {t.label}
        </button>
      {/each}
    </div>
  </section>

  <section>
    <h3 class="text-lg font-semibold mb-4">About</h3>
    <p class="text-sm text-text-dim">Covertone v0.1.0 — A Subsonic/Navidrome music client</p>
  </section>
</div>
