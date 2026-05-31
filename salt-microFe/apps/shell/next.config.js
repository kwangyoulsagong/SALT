/* eslint-disable @typescript-eslint/no-require-imports */
const NextFederationPlugin = require("@module-federation/nextjs-mf");
const { createVanillaExtractPlugin } = require("@vanilla-extract/next-plugin");

const withVanillaExtract = createVanillaExtractPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // 모든 호스트를 허용
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },
  reactStrictMode: true,
  transpilePackages: [
    "@repo/ui",
    "@repo/mocks",
    "@repo/message-event-bus",
  ],
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
          investments: options.isServer
            ? `investments@http://localhost:3002/_next/static/${
                options.isServer ? "ssr" : "chunks"
              }/remoteEntry.js`
            : `investments@http://localhost:3002/_next/static/chunks/remoteEntry.js`,
        },
        exposes: {},
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
