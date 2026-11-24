import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import obsidianmd from 'eslint-plugin-obsidianmd';

export default tseslint.config(
	{
		ignores: ['main.js', 'node_modules/**', 'scripts/**', 'esbuild.config.mjs', 'eslint.config.mjs'],
	},
	...obsidianmd.configs.recommended,
	{
		files: ['**/*.ts'],
		extends: [js.configs.recommended, ...tseslint.configs.recommended],
		languageOptions: {
			parserOptions: {
				ecmaVersion: 2020,
				sourceType: 'module',
				project: './tsconfig.json',
			},
		},
		rules: {
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': ['error', { args: 'none' }],
			'@typescript-eslint/ban-ts-comment': 'off',
			'no-prototype-builtins': 'off',
			'@typescript-eslint/no-empty-function': 'off',
		},
	},
);
