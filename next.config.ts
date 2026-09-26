import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Next's default Server Action body limit is 1MB - well under
      // validateCandidatePhoto's own 5MB cap (src/lib/storage/candidate-photo.ts),
      // so a 1-5MB photo passed the client-side size check but still got
      // rejected by the framework itself before ever reaching that
      // validation or its friendly error message, surfacing as an
      // uncaught error instead. A little headroom over 5MB accounts for
      // FormData/multipart overhead on top of the raw file bytes.
      bodySizeLimit: "6mb",
    },
  },
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
