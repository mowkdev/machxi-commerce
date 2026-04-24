module.exports = {
  root: true,
  extends: ['@repo/eslint-config/react.js'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  ignorePatterns: ['dist', 'node_modules', '.turbo'],
};
