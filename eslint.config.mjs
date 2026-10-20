import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
  files: ['apps/web/**/*.{js,jsx,ts,tsx}'],
  settings: {
    next: {
      rootDir: 'apps/web/',
    },
  },
  rules: {
    // AudioCanvas uses the App Router, not the legacy Pages Router.
    '@next/next/no-html-link-for-pages': 'off',
  },
  },
  prettier,
  globalIgnores([
    '**/node_modules/**',
    '**/.next/**',
    '**/out/**',
    '**/build/**',
    '**/coverage/**',
    '**/playwright-report/**',
    '**/test-results/**',
    '**/next-env.d.ts',
    'package-lock.json',
  ]),
]);
