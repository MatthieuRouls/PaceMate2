import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbo: {
      resolveAlias: {
        'gsap': './node_modules/gsap/index.js',
        'gsap/ScrollTrigger': './node_modules/gsap/ScrollTrigger.js',
      },
    },
  },
  transpilePackages: ['gsap'],
};

export default nextConfig;
