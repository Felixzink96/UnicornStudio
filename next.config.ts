import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Allow iframe embedding for WordPress integration
        // We remove X-Frame-Options entirely and use permissive CSP
        // This allows any WordPress site to embed the editor
        source: '/editor/:path*',
        headers: [
          {
            // Remove X-Frame-Options by not setting it
            // Use Content-Security-Policy instead
            key: 'Content-Security-Policy',
            value: "frame-ancestors *",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
