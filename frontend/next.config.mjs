/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ["js", "jsx", "ts", "tsx"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
