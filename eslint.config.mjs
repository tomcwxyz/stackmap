import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

/** @type {import('eslint').Linter.Config[]} */
const config = [
  {
    ignores: ['.next/**', 'out/**', 'node_modules/**'],
  },
  ...nextCoreWebVitals,
  {
    rules: {
      // The React Compiler-era rule flags our localStorage hydration and
      // animation effects. Those are pre-existing patterns that need a
      // considered refactor rather than a mechanical one, so they are warnings
      // until that work happens.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
];

export default config;
