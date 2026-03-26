/** @type {import("next").NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/index.html",
        destination: "/"
      },
      {
        source: "/:slug.html",
        destination: "/:slug"
      }
    ];
  }
};

export default nextConfig;
