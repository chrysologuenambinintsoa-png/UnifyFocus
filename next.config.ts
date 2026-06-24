import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' https://js.stripe.com https://checkout.stripe.com https://m.stripe.network https://hcaptcha.com https://*.hcaptcha.com https://newassets.hcaptcha.com https://b.stripecdn.com 'unsafe-eval' 'unsafe-inline' blob:",
              "style-src 'self' https://js.stripe.com https://hcaptcha.com https://*.hcaptcha.com https://m.stripe.network 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.stripe.com https://checkout.stripe.com https://q.stripe.com https://m.stripe.network https://hcaptcha.com https://*.hcaptcha.com",
              "frame-src https://js.stripe.com https://checkout.stripe.com https://hcaptcha.com https://*.hcaptcha.com",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
