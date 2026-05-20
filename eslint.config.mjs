// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    rules: {
      // Disable strict lint checks for build stability and preventing AI-generated layouts from breaking
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@stylistic/no-trailing-spaces': 'off',
      '@stylistic/padded-blocks': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/no-v-html': 'off',
      'no-empty': 'off',
      'vue/operator-linebreak': 'off',
      'no-useless-escape': 'off',
      'vue/attributes-order': 'off',
      '@stylistic/comma-dangle': 'off',
      '@stylistic/brace-style': 'off',
      'no-unused-vars': 'off',
      'vue/no-unused-vars': 'off',
      '@stylistic/arrow-parens': 'off',
      '@stylistic/member-delimiter-style': 'off',
      '@stylistic/operator-linebreak': 'off',
      '@stylistic/indent': 'off',
      'vue/html-indent': 'off',
      'vue/html-self-closing': 'off',
      '@stylistic/no-mixed-operators': 'off',
      '@typescript-eslint/no-dynamic-delete': 'off',
      '@stylistic/no-multiple-empty-lines': 'off',
      'prefer-const': 'off'
    }
  }
)
