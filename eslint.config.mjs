// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    rules: {
      // Re-enabled quality rules
      'prefer-const': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      'vue/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',

      // Relaxed formatting/stylistic rules for UI template flexibility
      'vue/no-mutating-props': 'off',
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
      '@stylistic/arrow-parens': 'off',
      '@stylistic/member-delimiter-style': 'off',
      '@stylistic/operator-linebreak': 'off',
      '@stylistic/indent': 'off',
      'vue/html-indent': 'off',
      'vue/html-self-closing': 'off',
      '@stylistic/no-mixed-operators': 'off',
      '@typescript-eslint/no-dynamic-delete': 'off',
      '@stylistic/no-multiple-empty-lines': 'off'
    }
  }
)
