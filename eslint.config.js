import js from '@eslint/js'

export default [
  js.configs.recommended,
  {
    rules: {
      'no-console': 'off',
      'no-unused-vars': 'warn',
      'no-undef': 'warn'
    }
  }
]
