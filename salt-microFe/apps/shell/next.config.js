const NextFederationPlugin = require('@module-federation/nextjs-mf');

module.exports = {
  webpack(config, options) {
    config.plugins.push(
      new NextFederationPlugin({
        name: 'shell',
        filename: 'static/chunks/remoteEntry.js',
        remotes: {
          goals: options.isServer
            ? `goals@http://localhost:3001/_next/static/${options.isServer ? 'ssr' : 'chunks'}/remoteEntry.js`
            : `goals@http://localhost:3001/_next/static/chunks/remoteEntry.js`,
        },
        exposes: {},
        shared: {
          react: {
            singleton: true,
            requiredVersion: false
          },
          'react-dom': {
            singleton: true,
            requiredVersion: false
          }
        }
      })
    );
    return config;
  }
};