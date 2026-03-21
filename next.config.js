/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['i.ebayimg.com', 'thumbs1.ebaystatic.com', 'thumbs2.ebaystatic.com'],
  },
};

module.exports = withPWA(nextConfig);
