import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist', 'legacy', 'coverage', 'node_modules'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // 项目里用 ['--tone' as string] 这种写法给 CSS 变量赋值，是有意为之
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // 中文排版里会有意使用全角空格（如「转化 67%　流失 3 家」），JSX 文本放行
      'no-irregular-whitespace': ['error', { skipJSXText: true, skipStrings: true }],
    },
  },
  {
    // Context 文件同时导出 Provider 组件和配套 hook 是刻意的结构，
    // 只影响 HMR 粒度，不拆
    files: ['src/store/*.tsx', 'src/components/charts/TooltipContext.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
);
