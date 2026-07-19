import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    exclude: ['**/node_modules/**', 'src/app/app.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/app/core/**/*.ts',
        'src/app/shared/services/**/*.ts',
        'src/app/guards/**/*.ts',
      ],
      exclude: ['**/*.spec.ts', '**/*.d.ts'],
    },
  },
});
