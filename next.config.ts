import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  async redirects() {
    return [
      {
        source: "/:orgSlug/login",
        destination: "/:orgSlug",
        permanent: true,
      },
      {
        source: "/login",
        destination: "/",
        permanent: true,
      },
      {
        source: "/:orgSlug/forgot-password",
        destination: "/:orgSlug",
        permanent: true,
      },
      {
        source: "/forgot-password",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
