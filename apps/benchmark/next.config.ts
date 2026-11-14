import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@choicemirror/contracts"],
};

export default nextConfig;
