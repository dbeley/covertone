# Contributing to Covertone

Thank you for your interest in contributing to Covertone! This document provides guidelines and information for contributors.

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/dbeley/covertone.git
   cd covertone
   ```

2. **Enter the development environment**
   ```bash
   direnv allow     # or: nix develop
   ```

3. **Install dependencies**
   ```bash
   pnpm install
   ```

4. **Start the development server**
   ```bash
   pnpm dev
   ```

## Code Style

- **Formatting**: Run `pnpm format` to auto-format code with Prettier
- **Linting**: Run `pnpm lint` to check ESLint + Prettier + svelte-check
- **Type checking**: Run `pnpm typecheck` for Svelte type checking

## Testing

- Run all tests: `pnpm test`
- Watch mode: `pnpm test:watch`

## Making Changes

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all tests pass (`pnpm test`)
4. Ensure code is formatted (`pnpm format`)
5. Ensure linting passes (`pnpm lint`)
6. Commit your changes with a clear message
7. Push to your fork and submit a pull request

## Pull Request Guidelines

- Provide a clear description of the changes
- Include screenshots for UI changes
- Reference any related issues
- Ensure CI checks pass

## Project Structure

- `src/` - Svelte components and TypeScript source code
- `src/lib/` - Shared utilities and components
- `src/routes/` - SvelteKit routes/pages
- `android/` - Capacitor Android project
- `ios/` - Capacitor iOS project (optional)

## Questions?

Feel free to open an issue if you have questions about contributing.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
