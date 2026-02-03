import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [75, 100], // Ajout de la qualité 100
    // Ajoute ici d'autres options si nécessaire
  },
  // Ajoute ici d'autres configurations Next.js si besoin
};

export default nextConfig;

