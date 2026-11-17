import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@choicemirror/contracts",
    "@choicemirror/browser-runner",
    "@choicemirror/metrics",
    "@choicemirror/storage",
  ],
};

export default nextConfig;
