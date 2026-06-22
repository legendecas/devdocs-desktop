const globals = require('globals');

module.exports = [
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      // eslint-config-rem
      indent: [2, 2, {SwitchCase: 1}],
      semi: [2, 'never'],
      'capitalized-comments': 0,
      'object-curly-spacing': ['error', 'always'],
      curly: ['error', 'multi-line'],
      'no-unused-expressions': ['error', {allowShortCircuit: true}],
      // Project-specific overrides
      'guard-for-in': 0,
      'max-params': ['error', 5],
      'import/order': 'off',
      'comma-dangle': 'off',
    },
  },
];
