import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import vitest from '@vitest/eslint-plugin';
import eslintComments from '@eslint-community/eslint-plugin-eslint-comments';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/*.config.*',
      '**/.husky/**',
      'apps/cli/bin/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: globals.node,
    },
  },
  ...tseslint.configs.strictTypeChecked,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'eslint-comments': eslintComments,
    },
    rules: {
      complexity: ['error', { max: 8 }],
      'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
      'max-statements': ['error', 20],
      'max-params': ['error', 4],
      'max-classes-per-file': ['error', 1],
      'block-scoped-var': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-loop-func': 'error',
      'no-nested-ternary': 'error',
      'no-warning-comments': [
        'error',
        { terms: ['TODO', 'FIXME', 'HACK', 'XXX'], location: 'start' },
      ],
      'no-empty': ['error', { allowEmptyCatch: false }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true, allowNullish: true },
      ],
      'eslint-comments/no-unlimited-disable': 'error',
      'eslint-comments/no-aggregating-enable': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'WhileStatement:has(Literal[value=true])',
          message:
            'Unbounded while loops are forbidden. Prefer a bounded loop over a finite collection.',
        },
        {
          selector: 'DoWhileStatement',
          message:
            'Do-while statements are forbidden. Prefer a bounded loop over a finite collection.',
        },
        {
          selector: 'ForStatement[test=null]',
          message:
            'Unbounded for loops are forbidden. Every loop must have a fixed, provable upper bound.',
        },
      ],
    },
  },
  {
    files: ['**/*.test.ts'],
    plugins: { vitest },
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'max-lines-per-function': 'off',
      'max-statements': 'off',
      'vitest/expect-expect': 'error',
      'vitest/consistent-test-it': ['error', { fn: 'it', withinDescribe: 'it' }],
      'vitest/prefer-to-be': 'error',
      'vitest/no-focused-tests': 'error',
      'vitest/no-disabled-tests': 'error',
    },
  },
);
