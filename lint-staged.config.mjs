/**
 * @param {string} configPath - path to ESLint config from repo root
 * @param {string[]} files
 * @returns {string[]}
 */
function eslintWithConfig(configPath, files) {
  if (files.length === 0) {
    return [];
  }
  const args = files.map((f) => JSON.stringify(f)).join(' ');
  return [`eslint --fix --max-warnings 0 -c ${configPath} ${args}`];
}

export default {
  '*.{ts,tsx,js,jsx,mjs,cjs,json,md,css}': 'prettier --write',
  'shared/src/**/*.ts': (files) => eslintWithConfig('shared/eslint.config.mjs', files),
  'backend/{src,test}/**/*.ts': (files) => eslintWithConfig('backend/eslint.config.mjs', files),
  'web-admin/**/*.{ts,tsx}': (files) => eslintWithConfig('web-admin/eslint.config.js', files),
};
