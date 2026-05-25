import { regexp } from '@betterer/regexp';

export default {
  'no todo comments': () => regexp(/(\/\/\s*TODO)/i, 'TODO match').include('./apps/**/*.{ts,tsx}'),
  'no ts-ignore': () => regexp(/@ts-ignore/, 'ts-ignore match').include('./apps/**/*.{ts,tsx}')
};
