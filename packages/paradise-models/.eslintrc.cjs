require('@festivaldev/eslint-config/patch');

module.exports = {
  extends: ['@festivaldev/eslint-config'],
  parserOptions: { tsconfigRootDir: __dirname },
  ignorePatterns: ['node_modules', 'dist']
};
