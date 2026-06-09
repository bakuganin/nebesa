/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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

