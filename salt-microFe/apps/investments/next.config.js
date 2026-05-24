const NextFederationPlugin = require("@module-federation/nextjs-mf");
const { createVanillaExtractPlugin } = require("@vanilla-extract/next-plugin");

const withVanillaExtract = createVanillaExtractPlugin();
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/ui", "@repo/store", "@repo/message-event-bus"],
  webpack(config, options) {
    config.plugins.push(
      new NextFederationPlugin({
        name: "investments",
        filename: "static/chunks/remoteEntry.js",
        exposes: {
          "./InvestmentsApp": "./src/pages/index.tsx",
          "./Investment": "./src/pages/investment/index.tsx",
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
          "@reduxjs/toolkit": {
            singleton: false,
            requiredVersion: false,
          },
          "react-redux": {
            singleton: false,
            requiredVersion: false,
          },
          "@repo/message-event-bus": {
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
