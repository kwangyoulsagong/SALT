const NextFederationPlugin = require("@module-federation/nextjs-mf");
const { createVanillaExtractPlugin } = require("@vanilla-extract/next-plugin");

const withVanillaExtract = createVanillaExtractPlugin();
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/ui", "@repo/store"],
  webpack(config, options) {
    config.plugins.push(
      new NextFederationPlugin({
        name: "goals",
        filename: "static/chunks/remoteEntry.js",
        exposes: {
          "./GoalsApp": "./src/pages/index.tsx",
        },
        shared: {
          react: {
            singleton: true,
            requiredVersion: false,
          },
          "react-dom": {
            singleton: true,
            requiredVersion: false,
          },
          "@tanstack/react-query": {
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
