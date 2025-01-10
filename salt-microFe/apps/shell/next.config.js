const NextFederationPlugin = require("@module-federation/nextjs-mf");
const { createVanillaExtractPlugin } = require("@vanilla-extract/next-plugin");

const withVanillaExtract = createVanillaExtractPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/ui", "@repo/store"],
  webpack(config, options) {
    config.plugins.push(
      new NextFederationPlugin({
        name: "shell",
        filename: "static/chunks/remoteEntry.js",
        remotes: {
          goals: options.isServer
            ? `goals@http://localhost:3001/_next/static/${
                options.isServer ? "ssr" : "chunks"
              }/remoteEntry.js`
            : `goals@http://localhost:3001/_next/static/chunks/remoteEntry.js`,
          game: options.isServer
            ? `game@http://localhost:3002/_next/static/${
                options.isServer ? "ssr" : "chunks"
              }/remoteEntry.js`
            : `game@http://localhost:3002/_next/static/chunks/remoteEntry.js`,
          social: options.isServer
            ? `social@http://localhost:3003/_next/static/${
                options.isServer ? "ssr" : "chunks"
              }/remoteEntry.js`
            : `social@http://localhost:3003/_next/static/chunks/remoteEntry.js`,
        },
        exposes: {},
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

module.exports = withVanillaExtract(nextConfig);
