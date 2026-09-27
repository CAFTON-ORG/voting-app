import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Next's client-side router cache otherwise reuses a dynamic page's
    // last render for up to 30s on back/forward navigation - so a voter
    // who submits a ballot and then hits Back could be shown the same
    // "cast your vote" form they just used, even though a real resubmit
    // is correctly rejected server-side (the cache only affects what's
    // painted, never the actual authorization check). Zero disables that
    // reuse for every dynamic route, so "have I already voted"/"is this
    // still open" is always re-checked fresh - worth the small perceived-
    // speed cost everywhere else for an app where stale state like that
    // is actively misleading, not just a minor staleness.
    staleTimes: {
      dynamic: 0,
    },
    serverActions: {
      // Next's default Server Action body limit is 1MB - well under
      // validateCandidatePhoto's own 10MB cap (src/lib/storage/candidate-photo.ts),
      // so a photo passing the client-side size check could still get
      // rejected by the framework itself before ever reaching that
      // validation or its friendly error message, surfacing as an
      // uncaught error instead. A little headroom over 10MB accounts for
      // FormData/multipart overhead on top of the raw file bytes.
      bodySizeLimit: "11mb",
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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Clickjacking protection - this is a voting app, and a "Vote
          // Now" button is exactly the kind of one-click sensitive action
          // a UI-redressing attack (an invisible iframe of this site over
          // a decoy page) targets. frame-ancestors is the modern
          // equivalent; X-Frame-Options stays for older browsers that
          // don't read CSP.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
