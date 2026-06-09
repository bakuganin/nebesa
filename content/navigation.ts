export const serviceLinks = [
  { href: "/services/funeral-organization", label: "Организация похорон" },
  { href: "/services/delivery-to-morgue", label: "Доставка в морг" },
  { href: "/services/cremation", label: "Кремация" },
  { href: "/services/viewing-hall", label: "Зал прощания" }
];

export const productCategoryLinks = [
  { href: "/products", label: "Все товары" },
  { href: "/products?category=wreaths", label: "Венки" },
  { href: "/products?category=coffins", label: "Гробы" },
  { href: "/products?category=memorials", label: "Памятники" },
  { href: "/products?category=grave-borders", label: "Опалубки и оградки" },
  { href: "/services/ritual-products", label: "Исходный раздел" }
];

export const mainLinks = [
  { href: "/", label: "Главная" },
  { href: "/services/funeral-organization", label: "Услуги", children: serviceLinks },
  { href: "/services/memorials-caskets", label: "Памятники" },
  { href: "/products", label: "Продукция", children: productCategoryLinks },
  { href: "/faq", label: "FAQ" }
];
