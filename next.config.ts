import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Candidate photos are served from this project's Supabase Storage
    // public bucket (see src/lib/storage/candidate-photo.ts) — restricted
    // to that exact path prefix, not a wildcard on the whole project,
    // since nothing else on the project's storage should be optimized/
    // proxied through next/image.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/candidate-media/**",
      },
    ],
  },
};

export default nextConfig;
