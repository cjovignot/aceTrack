/** @type {import('next').NextConfig} */

import nextPWA from "next-pwa";

const withPWA = nextPWA({
  dest: "public",

  register: true,
  skipWaiting: true,
  clientsClaim: true, // 🔥 important

  runtimeCaching: [
    {
      urlPattern: /\/manifest\.json$/,
      handler: "NetworkFirst", // 🔥 toujours vérifier version serveur
    },
    {
      urlPattern: /\/icons\/.*\.png$/,
      handler: "NetworkFirst", // 🔥 évite icônes figées
    },
  ],

  disable: process.env.NODE_ENV === "development",
});

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["res.cloudinary.com", "lh3.googleusercontent.com"],
  },
};

export default withPWA(nextConfig);
