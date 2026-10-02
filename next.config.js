const isVercel = !!process.env.VERCEL;

module.exports = {
  output: isVercel ? undefined : (process.env.NODE_ENV === 'production' ? 'export' : undefined),
  assetPrefix: isVercel ? undefined : (process.env.NODE_ENV === 'production' ? './' : undefined),
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
};

