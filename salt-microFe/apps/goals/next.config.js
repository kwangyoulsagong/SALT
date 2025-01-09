const NextFederationPlugin = require("@module-federation/nextjs-mf");

/** @type {import('next').NextConfig} */
module.exports = {
  transpilePackages: ["@repo/ui"],
  webpack(config, options) {
    config.plugins.push(
      new NextFederationPlugin({
        name: "goals",
        filename: `static/${
          options.isServer ? "ssr" : "chunks"
        }/remoteEntry.js`,
        exposes: {
          "./App": "./src/pages/_app.tsx",
        },
        remotes: {},
        shared: {
          react: {
            singleton: true,
            requiredVersion: false,
          },
          "react-dom": {
            singleton: true,
            requiredVersion: false,
          },
        },
      })
    );
    return config;
  },
};
