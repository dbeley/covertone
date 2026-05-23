<script lang="ts">
  import { shortcutsModalOpen } from '$lib/stores/ui';

  let isOpen = $derived($shortcutsModalOpen);

  type ShortcutGroup = {
    title: string;
    shortcuts: { keys: string[]; action: string }[];
  };

  const groups: ShortcutGroup[] = [
    {
      title: 'Playback',
      shortcuts: [
        { keys: ['Space'], action: 'Play / Pause' },
        { keys: ['Shift+.'], action: 'Next track' },
        { keys: ['Shift+,'], action: 'Previous track' },
        { keys: ['s'], action: 'Toggle shuffle' },
        { keys: ['r'], action: 'Toggle repeat' },
        { keys: ['Shift+F'], action: 'Toggle favorite' },
        { keys: ['m'], action: 'Mute / Unmute' },
      ],
    },
    {
      title: 'Seeking',
      shortcuts: [
        { keys: ['b'], action: 'Seek backward 10s' },
        { keys: ['f'], action: 'Seek forward 10s' },
      ],
    },
    {
      title: 'History',
      shortcuts: [
        { keys: ['Shift+H'], action: 'Go back' },
        { keys: ['Shift+L'], action: 'Go forward' },
      ],
    },
    {
      title: 'Volume',
      shortcuts: [
        { keys: ['+', '='], action: 'Volume up (5%)' },
        { keys: ['-'], action: 'Volume down (5%)' },
      ],
    },
    {
      title: 'Navigation',
      shortcuts: [
        { keys: ['1'], action: 'Home' },
        { keys: ['2'], action: 'Albums' },
        { keys: ['3'], action: 'Artists' },
        { keys: ['4'], action: 'Playlists' },
        { keys: ['5'], action: 'Favorites' },
        { keys: ['6'], action: 'Search' },
        { keys: ['7'], action: 'Game' },
        { keys: ['8'], action: 'Settings' },
        { keys: ['/'], action: 'Search (quick)' },
      ],
    },
    {
      title: 'Views',
      shortcuts: [
        { keys: ['v'], action: 'Open now playing view' },
        { keys: ['q'], action: 'Toggle queue' },
        { keys: ['?'], action: 'Toggle this help' },
        { keys: ['Escape'], action: 'Close overlays / clear selection' },
      ],
    },
    {
      title: 'Vim Movement',
      shortcuts: [
        { keys: ['h'], action: 'Move left' },
        { keys: ['l'], action: 'Move right' },
        { keys: ['j'], action: 'Move down (next row)' },
        { keys: ['k'], action: 'Move up (previous row)' },
        { keys: ['Enter'], action: 'Activate selected element' },
      ],
    },
  ];

  function close() {
    shortcutsModalOpen.set(false);
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-[70] flex items-center justify-center animate-fade-in"
  >
    <div
      class="absolute inset-0 bg-black/60 backdrop-blur-sm"
      onclick={close}
      role="button"
      aria-label="Close dialog"
      tabindex="0"
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') close(); }}
    ></div>

    <div
      class="relative w-full max-w-2xl max-h-[85vh] mx-4 bg-surface border border-border rounded-2xl shadow-2xl shadow-black/30 flex flex-col animate-scale-in overflow-hidden"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => { if (e.key === 'Escape') close(); }}
      role="dialog"
      aria-label="Keyboard shortcuts"
      tabindex="-1"
    >
      <div class="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <h2 class="text-xl font-bold tracking-tight">Keyboard Shortcuts</h2>
        <button
          class="p-2 rounded-xl hover:bg-white/5 text-text-dim hover:text-text transition-all duration-150 active:scale-90"
          onclick={close}
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
            <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <div class="overflow-y-auto flex-1 p-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          {#each groups as group (group.title)}
            <div>
              <h3 class="text-sm font-semibold text-accent uppercase tracking-wider mb-3">{group.title}</h3>
              <div class="space-y-2">
                {#each group.shortcuts as shortcut (shortcut.action)}
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-text-dim">{shortcut.action}</span>
                    <div class="flex gap-1 shrink-0 ml-4">
                      {#each shortcut.keys as key (key)}
                        <kbd class="px-2 py-0.5 text-xs font-mono bg-white/5 border border-border rounded-md text-text">{key}</kbd>
                      {/each}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
{/if}
