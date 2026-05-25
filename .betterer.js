import { eslintBetterer } from '@betterer/eslint';
import { typescriptBetterer } from '@betterer/typescript';

export default {
  'no eslint errors': () => eslintBetterer('./src', ['@typescript-eslint/no-unused-vars', 'error']),
  'no typescript errors': () => typescriptBetterer({
    tsconfigPath: './tsconfig.json'
  })
};
