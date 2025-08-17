import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      "lh3.googleusercontent.com",
      "flagcdn.com",
      "wvcmvstbzzhwaucxmeof.supabase.co"
      // případně další domény
    ],
  },
  output: 'standalone',
};

export default nextConfig;
