const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Alias react-dom to react-native for packages that incorrectly import it
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-dom') {
    return {
      filePath: require.resolve('react-native'),
      type: 'sourceFile',
    };
  }
  // Fall back to the default resolver
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
