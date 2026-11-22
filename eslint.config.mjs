// @ts-check
// Review-friendly, type-aware lint rules. CI and the pre-commit hook run with --max-warnings=0.
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import playwright from 'eslint-plugin-playwright';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const TEST_FILES = ['tests/**/*.ts'];

/** Every Playwright test body must describe its flow with test.step (readable reports for managers). */
const TEST_WITHOUT_STEP =
  "CallExpression[callee.name='test'] > :matches(ArrowFunctionExpression, FunctionExpression)" +
  ":not(:has(CallExpression[callee.object.name='test'][callee.property.name='step']))";

export default defineConfig(
  globalIgnores([
    'node_modules/',
    'playwright-report/',
    'test-results/',
    'allure-results/',
    'allure-report/',
    'allure-history/',
    'coverage-history/',
    'site/',
    'openapi/*.json',
  ]),

  // Plain JavaScript: stub, hooks, this file
  {
    files: ['**/*.{js,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },

  // TypeScript everywhere: strict, type-aware
  {
    files: ['**/*.{ts,mts}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // `type` everywhere: Playwright's test.extend<T> needs index-compatible object types
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-empty-object-type': ['error', { allowInterfaces: 'with-single-extends' }],
      'no-console': 'error',
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-param-reassign': 'error',
      complexity: ['error', 10],
      'max-depth': ['error', 3],
      'max-params': ['error', 5],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },

  // Framework code: explicit contracts at every module boundary
  {
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true, allowTypedFunctionExpressions: true },
      ],
      '@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'no-public' }],
    },
  },

  // Specs: Playwright best practices and framework guardrails
  {
    files: TEST_FILES,
    extends: [playwright.configs['flat/recommended']],
    rules: {
      'playwright/no-focused-test': 'error',
      'playwright/no-skipped-test': ['error', { allowConditional: true }],
      'playwright/no-conditional-in-test': 'error',
      'playwright/no-conditional-expect': 'error',
      'playwright/no-wait-for-timeout': 'error',
      'playwright/missing-playwright-await': 'error',
      'playwright/no-nested-step': 'error',
      'playwright/max-nested-describe': ['error', { max: 1 }],
      'playwright/require-top-level-describe': 'error',
      'playwright/require-tags': 'error',
      'playwright/valid-title': 'error',
      'playwright/no-identical-title': 'error',
      'playwright/expect-expect': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@playwright/test',
              message: "Import { test, expect } from 'src/fixtures' so fixtures are always available.",
            },
            {
              name: 'axios',
              message: 'Use the API clients from fixtures (APIRequestContext), not another HTTP library.',
            },
            {
              name: 'node-fetch',
              message: 'Use the API clients from fixtures (APIRequestContext), not fetch.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: TEST_WITHOUT_STEP,
          message: 'Describe the flow with test.step(...) so reports read as business steps.',
        },
        {
          selector: 'ArrowFunctionExpression > ObjectPattern > Property[key.name=/^(request|playwright)$/]',
          message:
            'Use the api/adminApi contexts or the API client fixtures instead of raw request/playwright.',
        },
        {
          selector: "NewExpression[callee.name='Promise'] CallExpression[callee.name='setTimeout']",
          message: 'No sleeps: use expect.poll or expect.toPass.',
        },
      ],
    },
  },

  // Setup and teardown projects are single, untagged tests by design
  {
    files: ['tests/setup/**/*.ts'],
    rules: { 'playwright/require-top-level-describe': 'off', 'playwright/require-tags': 'off' },
  },

  // Places allowed to write to the console
  {
    files: ['src/utils/logger.ts', 'stub/**', 'scripts/**'],
    rules: { 'no-console': 'off' },
  },

  prettier,
);
