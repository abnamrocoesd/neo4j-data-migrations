module.exports = {
  env: {
    browser: true,
    es6: true,
  },
  extends: 'airbnb-base',
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  rules: {
    'func-names': 0,
    'import/no-unresolved': false,
    'no-console': 'off',
    'no-param-reassign': ['error', {'props': false }],
  },
};
