const path = require("path");
const os = require("os");

const isOneDriveProject = __dirname.replace(/\\/g, "/").includes("OneDrive");
const isNextDev = process.argv.includes("dev");

function getDevDistDirRelative() {
  return path
    .relative(__dirname, path.join(os.tmpdir(), "jobilly-next-dev"))
    .replace(/\\/g, "/");
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep dev build output outside OneDrive — sync corrupts vendor-chunks and CSS.
  ...(isOneDriveProject && isNextDev ? { distDir: getDevDistDirRelative() } : {}),
  experimental: {
    typedRoutes: true,
    serverComponentsExternalPackages: ["pdf-parse", "pdfjs-dist", "mammoth"],
  },
  webpack: (config, { dev }) => {
    // OneDrive sync corrupts webpack chunks (undefined factory / CSS 404).
    if (dev && isOneDriveProject) {
      config.cache = false;
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
