/* eslint-env node */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true }
  },
  env: {
    browser: true,
    es2022: true,
    node: true
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript'
  ],
  settings: {
    react: { version: 'detect' },
    'import/resolver': {
      typescript: { project: './tsconfig.json' },
      node: true
    }
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'import/order': ['warn', { 'newlines-between': 'never', alphabetize: { order: 'asc' } }],
    'import/no-restricted-paths': [
      'error',
      {
        zones: [
          { target: './src/games', from: './src/ui', message: 'games/** must not import from ui/**' },
          { target: './src/games', from: './src/screens', message: 'games/** must not import from screens/**' },
          { target: './src/games', from: './src/storage', message: 'games/** must not import from storage/**' },
          { target: './src/games', from: './src/hooks', message: 'games/** must not import from hooks/**' },
          { target: './src/games', from: './src/app', message: 'games/** must not import from app/**' },
          { target: './src/ui', from: './src/storage', message: 'ui/** must not import from storage/**' },
          { target: './src/ui', from: './src/games', message: 'ui/** must not import from games/**' },
          { target: './src/screens', from: './src/storage', message: 'screens/** must not import from storage/** directly — go through hooks/**' },
          { target: './src/storage', from: './src/games', message: 'storage/** must not import from games/**' },
          { target: './src/storage', from: './src/ui', message: 'storage/** must not import from ui/**' },
          { target: './src/storage', from: './src/screens', message: 'storage/** must not import from screens/**' }
        ]
      }
    ]
  },
  ignorePatterns: [
    'dist',
    'dev-dist',
    'node_modules',
    'coverage',
    'playwright-report',
    'test-results',
    '*.config.ts',
    '*.config.cjs',
    'scripts/**/*.mjs'
  ]
};
