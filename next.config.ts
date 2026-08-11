import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // Required for React's <ViewTransition> in app/layout.tsx. Without browser
    // support the app still works, the navigations simply do not animate.
    viewTransition: true,
  },
};

export default nextConfig;
