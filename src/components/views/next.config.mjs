/** @type {import('next').NextConfig} */

const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://js.stripe.com https://m.stripe.network https://hcaptcha.com https://*.hcaptcha.com https://accounts.youtube.com https://*.google.com;
    style-src 'self' 'unsafe-inline' https://js.stripe.com https://hcaptcha.com https://*.hcaptcha.com;
    img-src 'self' blob: data: https://*.stripe.com;
    font-src 'self';
    frame-src 'self' https://js.stripe.com https://m.stripe.network https://hcaptcha.com https://*.hcaptcha.com;
    connect-src 'self' https://api.stripe.com https://api.groq.com https://api.github.com wss://*.hcaptcha.com https://accounts.youtube.com https://*.google.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim();

const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
    ];
  },
};

export default nextConfig;