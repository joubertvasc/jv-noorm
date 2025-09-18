import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';

export default [
  // Regras base do JS
  js.configs.recommended,

  // Regras base do TypeScript
  ...tseslint.configs.recommended,

  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['*.js', 'node_modules/**', 'dist/**'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: globals.node,
    },
    plugins: {
      prettier: prettierPlugin,
      'simple-import-sort': simpleImportSort,
      '@typescript-eslint': tseslint.plugin, // <-- carrega o plugin no contexto correto
    },
    rules: {
      /* --- Prettier --- */
      'prettier/prettier': 'error',
      '@typescript-eslint/no-explicit-any': 'off',

      /* --- Imports: ordenação automática --- */
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',

      /* --- Variáveis/funções/imports não usados --- */
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      /* --- Outras regras úteis --- */
      'import/prefer-default-export': 'off',
      'no-param-reassign': 'off',
      'no-nested-ternary': 'off',
      '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
    },
  },
];
