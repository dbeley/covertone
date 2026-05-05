import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import sveltePlugin from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'android/**',
      '.superpowers/**',
      'docs/**',
      'pnpm-lock.yaml',
    ],
  },
  {
    languageOptions: {
      globals: {
        document: 'readonly',
        window: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        localStorage: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        requestAnimationFrame: 'readonly',
        HTMLMediaElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLElement: 'readonly',
        Audio: 'readonly',
        MutationObserver: 'readonly',
        IntersectionObserver: 'readonly',
        HTMLDivElement: 'readonly',
        Event: 'readonly',
        MouseEvent: 'readonly',
        DOMException: 'readonly',
        KeyboardEvent: 'readonly',
        navigator: 'readonly',
        MediaMetadata: 'readonly',
        TouchEvent: 'readonly',
        NodeJS: 'readonly',
      },
    },
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    },
  },
  {
    files: ['src/**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.svelte'],
        svelteFeatures: { experimentalGenerics: true },
      },
    },
    plugins: { svelte: sveltePlugin },
    rules: {
      ...sveltePlugin.configs['flat/recommended'].reduce((acc, c) => ({ ...acc, ...c.rules }), {}),
      'svelte/no-at-html-tags': 'off',
    },
  },
  {
    files: ['*.config.{ts,js}', 'tests/**/*.ts', 'src/main.ts', 'src/vite-env.d.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
);
