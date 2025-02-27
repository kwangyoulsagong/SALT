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
    "@repo/store",
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
          missions: options.isServer
            ? `missions@http://localhost:3004/_next/static/${
                options.isServer ? "ssr" : "chunks"
              }/remoteEntry.js`
            : `missions@http://localhost:3004/_next/static/chunks/remoteEntry.js`,
          analysis: options.isServer
            ? `analysis@http://localhost:3005/_next/static/${
                options.isServer ? "ssr" : "chunks"
              }/remoteEntry.js`
            : `analysis@http://localhost:3005/_next/static/chunks/remoteEntry.js`,
          ranking: options.isServer
            ? `ranking@http://localhost:3006/_next/static/${
                options.isServer ? "ssr" : "chunks"
              }/remoteEntry.js`
            : `ranking@http://localhost:3006/_next/static/chunks/remoteEntry.js`,
          notification: options.isServer
            ? `notification@http://localhost:3007/_next/static/${
                options.isServer ? "ssr" : "chunks"
              }/remoteEntry.js`
            : `notification@http://localhost:3007/_next/static/chunks/remoteEntry.js`,
          bank: options.isServer
            ? `bank@http://localhost:3008/_next/static/${
                options.isServer ? "ssr" : "chunks"
              }/remoteEntry.js`
            : `bank@http://localhost:3008/_next/static/chunks/remoteEntry.js`,
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
