/* global jest */

jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return {
    GestureHandlerRootView: View,
  };
});

jest.mock('react-native-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: View,
  };
});

jest.mock('./src/navigation/RootNavigator', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    RootNavigator: () => React.createElement(View),
  };
});
