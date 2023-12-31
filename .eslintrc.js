module.exports = {
  root: true,
  extends: ['erb', 'plugin:@typescript-eslint/recommended'],
  ignorePatterns: ['.erb/**/*'],
  rules: {
    // A temporary hack related to IDE not resolving correct package.json
    'import/no-extraneous-dependencies': 'off',
    'import/no-unresolved': 'error',
    // Since React 17 and typescript 4.1 you can safely disable the rule
    'react/react-in-jsx-scope': 'off',
    'no-restricted-syntax': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    'import/prefer-default-export': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'class-methods-use-this': 'off',
    'react/require-default-props': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    'max-classes-per-file': 'off',
    'react/jsx-props-no-spreading': 'off',
    'react/prop-types': 'off',
    'react/destructuring-assignment': 'off',
    'react-hooks/rules-of-hooks': 'off',
    'react/no-unused-prop-types': 'off',
    'no-useless-constructor': 'off',
    'react/jsx-no-useless-fragment': 'off',
    'no-continue': 'off',
    'react/jsx-filename-extension': ['error', { extensions: ['.jsx', '.tsx'] }],
    'react/no-unstable-nested-components': 'off',
    'no-implicit-coercion': [
      'warn',
      {
        boolean: true,
        number: true,
        string: true,
        disallowTemplateShorthand: true,
        allow: [],
      },
    ],
    '@typescript-eslint/strict-boolean-expressions': 'error',
    'no-use-before-define': [
      'off',
      {
        functions: true,
        classes: true,
        variables: true,
      },
    ],
    '@typescript-eslint/no-use-before-define': [
      'off',
      {
        functions: true,
        classes: true,
        variables: true,
      },
    ],
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/naming-convention': [
      'warn',
      {
        selector: ['variable', 'function'],
        format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
        leadingUnderscore: 'allow',
      },
    ],
    'no-underscore-dangle': 'off',
    'no-plusplus': 'off',
    'jsx-a11y/click-events-have-key-events': 'off',
    'jsx-a11y/no-static-element-interactions': 'off',
    'jsx-a11y/alt-text': 'off',
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        js: 'never',
        jsx: 'never',
        ts: 'never',
        tsx: 'neve',
      },
    ],
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    createDefaultProgram: true,
  },
  settings: {
    'import/resolver': {
      // See https://github.com/benmosher/eslint-plugin-import/issues/1396#issuecomment-575727774 for line below
      node: {},
      webpack: {
        config: require.resolve('./.erb/configs/webpack.config.eslint.ts'),
      },
      typescript: {},
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
  },
};
