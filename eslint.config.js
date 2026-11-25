import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.turbo/**',
      '**/coverage/**',
      'docker/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['apps/**/*.{ts,tsx}', 'packages/**/*.ts'],
    settings: {
      'boundaries/include': ['apps/**', 'packages/**'],
      'boundaries/root-path': import.meta.dirname,
      // Resolves TS + workspace "exports" so boundary rules see real targets
      'import/resolver': {
        typescript: { alwaysTryTypes: true },
        node: { extensions: ['.ts', '.tsx', '.js', '.jsx'] },
      },
      'boundaries/elements': [
        { type: 'app-api', pattern: 'apps/api/**' },
        { type: 'app-web', pattern: 'apps/web/**' },
        { type: 'lib-contracts', pattern: 'packages/contracts/**' },
        { type: 'lib-core', pattern: 'packages/core/**' },
        { type: 'lib-business', pattern: 'packages/business/**' },
      ],
    },
    plugins: { boundaries },
    rules: {
      // Module boundaries (AGENTS.md, PRD §6.1): platform modules may only use
      // the core public API and shared contracts; apps compose everything.
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: ['lib-contracts'], allow: [] },
            { from: ['lib-core'], allow: ['lib-contracts'] },
            { from: ['lib-business'], allow: ['lib-core', 'lib-contracts'] },
            { from: ['app-api'], allow: ['lib-core', 'lib-contracts', 'lib-business'] },
            { from: ['app-web'], allow: ['lib-contracts'] },
          ],
        },
      ],
    },
  },
);
