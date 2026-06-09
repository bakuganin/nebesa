const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseHostname = null;

if (supabaseUrl) {
  try {
    supabaseHostname = new URL(supabaseUrl).hostname;
  } catch {
    supabaseHostname = null;
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/faq-page.html", destination: "/faq", permanent: true },
      {
        source: "/services/funeral-organization.html",
        destination: "/services/funeral-organization",
        permanent: true
      },
      {
        source: "/services/delivery-to-morgue.html",
        destination: "/services/delivery-to-morgue",
        permanent: true
      },
      { source: "/services/cremation.html", destination: "/services/cremation", permanent: true },
      { source: "/services/viewing-hall.html", destination: "/services/viewing-hall", permanent: true },
      {
        source: "/services/memorials-caskets.html",
        destination: "/services/memorials-caskets",
        permanent: true
      },
      {
        source: "/services/ritual-products.html",
        destination: "/services/ritual-products",
        permanent: true
      }
    ];
  }
};

export default nextConfig;
