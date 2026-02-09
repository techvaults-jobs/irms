/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance optimizations
  compress: true,
  swcMinify: true,
  
  // Security headers
  poweredByHeader: false,
  
  // Production source maps disabled for security
  productionBrowserSourceMaps: false,
  
  // React strict mode for development
  reactStrictMode: true,
  
  // Disable experimental compiler for production stability
  // reactCompiler: true, // Uncomment only if thoroughly tested
};

module.exports = nextConfig;
