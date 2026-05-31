/* eslint-disable @typescript-eslint/no-require-imports */
const NextFederationPlugin = require("@module-federation/nextjs-mf");
const { createVanillaExtractPlugin } = require("@vanilla-extract/next-plugin");

const withVanillaExtract = createVanillaExtractPlugin();
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/ui", "@repo/message-event-bus"],
  webpack(config) {
    config.plugins.push(
      new NextFederationPlugin({
        name: "goals",
        filename: "static/chunks/remoteEntry.js",
        exposes: {
          "./GoalsApp": "./src/pages/index.tsx",
          "./AddGoals": "./src/pages/addgoals/index.tsx",
        },
        shared: {
          "@tanstack/react-query": {
            singleton: false,
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
