export const serviceLinks = [
  { href: "/services/funeral-organization", label: "Организация похорон" },
  { href: "/services/delivery-to-morgue", label: "Доставка в морг" },
  { href: "/services/cremation", label: "Кремация" },
  { href: "/services/viewing-hall", label: "Зал прощания" }
];

export const mainLinks = [
  { href: "/", label: "Главная" },
  { href: "/services/funeral-organization", label: "Услуги", children: serviceLinks },
  { href: "/services/memorials-caskets", label: "Памятники" },
  { href: "/services/ritual-products", label: "Продукция" },
  { href: "/faq", label: "FAQ" }
];

