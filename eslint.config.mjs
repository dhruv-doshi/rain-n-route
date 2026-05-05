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
  // Boundaries plugin — enforced as errors from Phase 3 onward
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
            { from: 'app', allow: ['components', 'hooks', 'lib', 'types'] },
            { from: 'components', allow: ['components', 'hooks', 'lib', 'types'] },
            { from: 'hooks', allow: ['services', 'store', 'lib', 'types'] },
            { from: 'services', allow: ['lib', 'types'] },
            { from: 'store', allow: ['lib', 'types'] },
            { from: 'lib', allow: ['types'] },
            { from: 'types', allow: [] },
          ],
        },
      ],
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);

export default eslintConfig;
