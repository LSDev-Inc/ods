/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    const privateHeaders = [
      { key: "Cache-Control", value: "private, no-store, max-age=0" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
    ];

    return [
      {
        source: "/user/:path*",
        headers: privateHeaders
      },
      {
        source: "/users",
        headers: privateHeaders
      },
      {
        source: "/admin/:path*",
        headers: privateHeaders
      },
      {
        source: "/owner/:path*",
        headers: privateHeaders
      },
      {
        source: "/api/:path*",
        headers: privateHeaders
      },
      {
        source: "/auth/:path*",
        headers: privateHeaders
      },
      {
        source: "/access",
        headers: privateHeaders
      }
    ];
  }
};

export default nextConfig;
