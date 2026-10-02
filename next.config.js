module.exports = {
  output: 'export',
  assetPrefix: process.env.NODE_ENV === 'production' ? './' : undefined,
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
};
