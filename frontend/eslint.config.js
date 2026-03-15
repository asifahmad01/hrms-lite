// ESLint v9 flat config
// https://eslint.org/docs/latest/use/configure/configuration-files
import js           from '@eslint/js'
import tseslint     from 'typescript-eslint'
import reactHooks   from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default tseslint.config(
  // ── Global ignores ──────────────────────────────────────────────────────────
  {
    ignores: ['dist/**', 'node_modules/**', '*.config.js'],
  },

  // ── Base JS rules ───────────────────────────────────────────────────────────
  js.configs.recommended,

  // ── TypeScript + React rules ────────────────────────────────────────────────
  {
    files:   ['src/**/*.{ts,tsx}'],
    extends: [
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project:        true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks':   reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // ── React hooks ────────────────────────────────────────────────────────
      ...reactHooks.configs.recommended.rules,

      // Only export components from TSX files (HMR reliability)
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // ── TypeScript ─────────────────────────────────────────────────────────
      // Enforce `import type` for type-only imports (keeps runtime bundle clean)
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      // Warn on unused vars; _ prefix opts a variable out
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          args:              'all',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors:      'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Allow `any` in catch blocks and legacy escape hatches — warn elsewhere
      '@typescript-eslint/no-explicit-any': 'warn',

      // Allow non-null assertions (we use them deliberately in a few places)
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Floated promises should be handled — catches missing `await`
      '@typescript-eslint/no-floating-promises': 'error',

      // Allow `void` operator to explicitly discard a promise
      'no-void': ['error', { allowAsStatement: true }],

      // Prefer nullish coalescing over || for nullable defaults
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',

      // ── General JS quality ─────────────────────────────────────────────────
      // Disallow console.log in production code; console.warn/error are OK
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Enforce === over == (except null checks)
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },
)
