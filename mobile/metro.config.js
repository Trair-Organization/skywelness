const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');
const sharedRoot = path.resolve(monorepoRoot, 'shared');
const monorepoNodeModules = path.resolve(monorepoRoot, 'node_modules');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  // Watching full monorepo can exceed watcher limits on macOS (EMFILE).
  // Only watch workspace packages imported by mobile.
  watchFolders: [sharedRoot, monorepoNodeModules],
  /** Avoid 8081 — other stacks (e.g. Nest) often use it; wrong server returns JSON 404 for /index.bundle */
  server: {
    port: 8082,
  },
  resolver: {
    // Local watchman daemon is unreliable on this machine; force Node watcher.
    useWatchman: false,
    // Force a single React instance in monorepo to avoid invalid hook context.
    extraNodeModules: {
      react: path.resolve(monorepoRoot, 'node_modules/react'),
      'react-native': path.resolve(monorepoRoot, 'node_modules/react-native'),
      '@babel/runtime': path.resolve(monorepoRoot, 'node_modules/@babel/runtime'),
      'react-native-gesture-handler': path.resolve(
        monorepoRoot,
        'node_modules/react-native-gesture-handler',
      ),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
