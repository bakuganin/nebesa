export const legacyRedirects = [
  { source: "/index.html", destination: "/" },
  { source: "/faq-page.html", destination: "/faq" },
  { source: "/services/funeral-organization.html", destination: "/services/funeral-organization" },
  { source: "/services/delivery-to-morgue.html", destination: "/services/delivery-to-morgue" },
  { source: "/services/cremation.html", destination: "/services/cremation" },
  { source: "/services/viewing-hall.html", destination: "/services/viewing-hall" },
  { source: "/services/memorials-caskets.html", destination: "/services/memorials-caskets" },
  { source: "/services/ritual-products.html", destination: "/services/ritual-products" }
];

export const legacyHashRoutes = [
  {
    source: "/index.html#services-section",
    destination: "/#services-section",
    behavior: "center services section after navigation"
  }
];

