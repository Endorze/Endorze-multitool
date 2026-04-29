import type { NextConfig } from "next";

const isTauriBuild = process.env.TAURI_BUILD === "true";

const nextConfig: NextConfig = {
  typedRoutes: true,

  ...(isTauriBuild
    ? {
        output: "export",
        images: {
          unoptimized: true,
        },
      }
    : {
        output: "standalone",
      }),
};

export default nextConfig;