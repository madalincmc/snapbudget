import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Native tsconfig path resolution, so tests import `@/…` the way the app
  // does. Vite handles this itself now — the vite-tsconfig-paths plugin the
  // Next.js guide suggests is redundant on this version and warns as much.
  resolve: { tsconfigPaths: true },
  test: {
    // Node rather than jsdom: these suites cover pure date and money logic.
    // Nothing here renders, so a DOM would be dead weight on every run.
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
  },
});
