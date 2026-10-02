module.exports = {
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  assetPrefix: process.env.NODE_ENV === 'production' ? './' : undefined,
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
};
