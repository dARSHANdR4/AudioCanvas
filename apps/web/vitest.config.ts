import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: '../..',
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    clearMocks: true,
  },
});
