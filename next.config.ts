import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: [
      "lh3.googleusercontent.com",
      "flagcdn.com",
      "wvcmvstbzzhwaucxmeof.supabase.co"
      // případně další domény
    ],
  },
};

export default nextConfig;
