const webpack = require('webpack');

module.exports = function override(config) {
  // Ignore React Native modules that MetaMask SDK tries to import
  config.resolve.fallback = {
    ...config.resolve.fallback,
    '@react-native-async-storage/async-storage': false,
  };
  
  // Add plugin to ignore the module
  config.plugins = [
    ...config.plugins,
    new webpack.IgnorePlugin({
      resourceRegExp: /^@react-native-async-storage\/async-storage$/,
    }),
  ];
  
  return config;
};

