export type GalleryItem = {
  src: string;
  title: string;
  description: string;
};

export const galleryPageSize = 9;

export const galleryItems: GalleryItem[] = [
  {
    src: "/images/Pillar1.jpg",
    title: "Классический памятник",
    description: "Строгая форма с полированной поверхностью.",
  },
  {
    src: "/images/ArrayPillar1.jpg",
    title: "Семейный комплекс",
    description: "Композиция из нескольких вертикальных элементов.",
  },
  {
    src: "/images/StandartPillar4.jpg",
    title: "Вертикальный памятник",
    description: "Лаконичное решение для индивидуального захоронения.",
  },
  {
    src: "/images/HalfPillar1.jpg",
    title: "Низкий памятник",
    description: "Сдержанная горизонтальная форма.",
  },
  {
    src: "/images/Pillar2.jpg",
    title: "Полированный гранит",
    description: "Пример формы и фактуры для памятника.",
  },
  {
    src: "/images/Pillar3.jpg",
    title: "Высокий памятник",
    description: "Вертикальная композиция с мягким силуэтом.",
  },
  {
    src: "/images/ArrayPillar2.jpg",
    title: "Комплекс из гранита",
    description: "Многосоставной мемориальный комплекс.",
  },
  {
    src: "/images/StandartPillar1.jpg",
    title: "Стандартная форма",
    description: "Практичное решение для индивидуального заказа.",
  },
  {
    src: "/images/StandartPillar2.jpg",
    title: "Лаконичный памятник",
    description: "Сдержанная форма с ровными линиями.",
  },
  {
    src: "/images/viewing-hall_1.webp",
    title: "Зал прощания",
    description: "Пространство для спокойной церемонии.",
  },
  {
    src: "/images/Cremation_1.webp",
    title: "Кремация",
    description: "Иллюстрация услуги кремации и сопровождения.",
  },
  {
    src: "/images/Catalog-of-ritual-products_1.webp",
    title: "Ритуальная продукция",
    description: "Сопутствующие товары и материалы.",
  },
  {
    src: "/images/ven1_1ven1.webp",
    title: "Венок",
    description: "Один из вариантов ритуального оформления.",
  },
  {
    src: "/images/ven2_1ven2.webp",
    title: "Траурная композиция",
    description: "Пример цветочной композиции.",
  },
  {
    src: "/images/ven3_1.webp",
    title: "Классический венок",
    description: "Оформление для церемонии прощания.",
  },
  {
    src: "/images/204a.png",
    title: "Гранитная деталь",
    description: "Элемент из каталога памятников.",
  },
  {
    src: "/images/208a.png",
    title: "Мемориальная форма",
    description: "Изображение из текущего архива продукции.",
  },
  {
    src: "/images/photo_2024-06-12_14-09-32.jpg",
    title: "Рабочий пример",
    description: "Фотография из текущего набора материалов сайта.",
  },
];

export function getGalleryPage(page: number, limit = galleryPageSize) {
  const normalizedPage = Math.max(1, Math.floor(page));
  const normalizedLimit = Math.min(24, Math.max(1, Math.floor(limit)));
  const from = (normalizedPage - 1) * normalizedLimit;
  const items = galleryItems.slice(from, from + normalizedLimit);

  return {
    items,
    page: normalizedPage,
    pageCount: Math.ceil(galleryItems.length / normalizedLimit),
    total: galleryItems.length,
  };
}
