const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [monorepoRoot],
  /** Avoid 8081 — other stacks (e.g. Nest) often use it; wrong server returns JSON 404 for /index.bundle */
  server: {
    port: 8082,
  },
  resolver: {
    // Prevent Metro from walking up parent folders and picking hoisted React copies.
    disableHierarchicalLookup: true,
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(monorepoRoot, 'node_modules'),
    ],
    // React sürüm mismatch'ini engellemek için mobile local kopyayı zorla.
    extraNodeModules: {
      react: path.resolve(projectRoot, 'node_modules/react'),
      'react/jsx-runtime': path.resolve(projectRoot, 'node_modules/react/jsx-runtime'),
      'react/jsx-dev-runtime': path.resolve(projectRoot, 'node_modules/react/jsx-dev-runtime'),
      'react-test-renderer': path.resolve(projectRoot, 'node_modules/react-test-renderer'),
      scheduler: path.resolve(projectRoot, 'node_modules/scheduler'),
    },
  },
  transformer: {
    // In npm workspaces, metro-runtime can be hoisted to monorepo root.
    // Force Metro to use the hoisted asyncRequire path instead of mobile/node_modules.
    asyncRequireModulePath: path.resolve(
      monorepoRoot,
      'node_modules/metro-runtime/src/modules/asyncRequire',
    ),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
