import js from '@eslint/js'

export default [
  js.configs.recommended,
  {
    ignores: [
      '__tests__/*',
      '.devcontainer/*',
      '.github/*',
      'badges/*',
      'dist/*'
    ],
    rules: {
      'no-console': 'off',
      'no-unused-vars': 'warn',
      'no-undef': 'warn'
    }
  }
]
