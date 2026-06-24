import type { NextConfig } from "next";

const devCsp = [
  "default-src 'self'",
  "script-src 'self' https://js.stripe.com https://checkout.stripe.com https://m.stripe.network https://b.stripecdn.com blob: 'unsafe-inline' 'unsafe-eval'",
  "script-src-elem 'self' https://js.stripe.com https://checkout.stripe.com https://m.stripe.network https://b.stripecdn.com blob: 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://js.stripe.com https://m.stripe.network blob:",
  "style-src-elem 'self' 'unsafe-inline' https://js.stripe.com https://m.stripe.network blob:",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.stripe.com https://checkout.stripe.com https://q.stripe.com https://m.stripe.network wss: blob:",
  "frame-src https://js.stripe.com https://checkout.stripe.com https://m.stripe.network",
  "upgrade-insecure-requests",
].join('; ');

const prodCsp = [
  "default-src 'self'",
  "script-src 'self' https://js.stripe.com https://checkout.stripe.com https://m.stripe.network https://hcaptcha.com https://*.hcaptcha.com https://newassets.hcaptcha.com https://b.stripecdn.com 'unsafe-eval' 'unsafe-inline' blob:",
  "script-src-elem 'self' https://js.stripe.com https://checkout.stripe.com https://m.stripe.network https://hcaptcha.com https://*.hcaptcha.com https://newassets.hcaptcha.com https://b.stripecdn.com 'unsafe-eval' 'unsafe-inline' blob:",
  "style-src 'self' https://js.stripe.com https://hcaptcha.com https://*.hcaptcha.com https://m.stripe.network 'unsafe-inline'",
  "style-src-elem 'self' https://js.stripe.com https://hcaptcha.com https://*.hcaptcha.com https://m.stripe.network 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.stripe.com https://checkout.stripe.com https://q.stripe.com https://m.stripe.network https://hcaptcha.com https://*.hcaptcha.com",
  "frame-src https://js.stripe.com https://checkout.stripe.com https://hcaptcha.com https://*.hcaptcha.com",
  "upgrade-insecure-requests",
].join('; ');

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
            // Use a permissive CSP only in development for safe testing of Stripe Checkout
            value: process.env.NODE_ENV === 'development' ? devCsp : prodCsp,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
