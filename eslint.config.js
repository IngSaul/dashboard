import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'coverage',
    'dist',
    'node_modules',
    'server/dist',
    // Generated declaration output, not source. Nothing in this repo hand-writes one.
    '**/*.d.ts',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended, tseslint.configs.strict],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // The backend is Node, not a browser: `globals.browser` would leave
    // `process` and `Buffer` undeclared while pretending `window` exists.
    // Its rules are otherwise identical to the frontend's on purpose —
    // auth and persistence code is exactly where a silent `any` matters
    // most, and it was previously excluded from linting altogether.
    files: ['server/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // React-specific rulesets, scoped to the code that actually renders
    // React. Playwright specs and build/test config files contain none, and
    // `react-hooks` there only produces false positives — Playwright's
    // fixture callbacks take a parameter named `use`, which the rule reads
    // as React's `use` hook being called outside a component.
    files: ['src/**/*.{ts,tsx}', 'tests/integration/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
  },
])
