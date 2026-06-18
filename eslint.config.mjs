import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier';
import boundaries from 'eslint-plugin-boundaries';

/** @type {import('eslint-plugin-boundaries').ElementType[]} */
const boundaryElements = [
  { type: 'app', pattern: 'src/app/**/*' },
  { type: 'components', pattern: 'src/components/**/*' },
  { type: 'hooks', pattern: 'src/hooks/**/*' },
  { type: 'services', pattern: 'src/services/**/*' },
  { type: 'store', pattern: 'src/store/**/*' },
  { type: 'lib', pattern: 'src/lib/**/*' },
  { type: 'types', pattern: 'src/types/**/*' },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig,
  // Keep imports flowing from UI layers toward domain layers.
  {
    plugins: { boundaries },
    settings: {
      'boundaries/elements': boundaryElements,
      'boundaries/ignore': ['**/*.test.*', '**/*.spec.*', 'tests/**/*'],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          rules: [
            {
              from: { type: 'app' },
              allow: { to: { type: ['components', 'hooks', 'lib', 'types'] } },
            },
            {
              from: { type: 'components' },
              allow: { to: { type: ['components', 'hooks', 'lib', 'types'] } },
            },
            {
              from: { type: 'hooks' },
              allow: { to: { type: ['services', 'store', 'lib', 'types'] } },
            },
            {
              from: { type: 'services' },
              allow: { to: { type: ['lib', 'types'] } },
            },
            {
              from: { type: 'store' },
              allow: { to: { type: ['lib', 'types'] } },
            },
            { from: { type: 'lib' }, allow: { to: { type: 'types' } } },
            { from: { type: 'types' }, disallow: { to: { type: '*' } } },
          ],
        },
      ],
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);

export default eslintConfig;
