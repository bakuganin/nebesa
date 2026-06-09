import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";

export const metadata: Metadata = {
  title: "Галерея работ | NEBESA",
  description: "Фотографии памятников, залов прощания и ритуальной продукции NEBESA.",
};

const galleryItems = [
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
    src: "/images/memorial_1.webp",
    title: "Мемориальное оформление",
    description: "Пример визуального оформления раздела памятников.",
  },
  {
    src: "/images/kat5.jpg",
    title: "Гранитные элементы",
    description: "Материалы и детали для комплектации заказа.",
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
    src: "/images/photo_2024-06-12_14-09-32.jpg",
    title: "Рабочий пример",
    description: "Фотография из текущего набора материалов сайта.",
  },
];

export default function GalleryPage() {
  return (
    <main className="min-h-screen bg-mist text-ink">
      <Header />
      <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:py-14">
        <nav className="mb-8 text-sm text-moss" aria-label="Навигация">
          <Link href="/" className="hover:text-brass">
            Главная
          </Link>
          <span className="mx-2">/</span>
          <span>Галерея</span>
        </nav>

        <header className="mb-8 max-w-3xl">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.08em] text-brass">Работы и материалы</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">Галерея NEBESA</h1>
          <p className="mt-4 text-base leading-7 text-moss">
            Изображения из текущего архива сайта: памятники, материалы, зал прощания и сопутствующие услуги.
          </p>
        </header>

        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Фотографии NEBESA">
          {galleryItems.map((item, index) => (
            <article key={item.src} className="overflow-hidden rounded bg-white shadow-sm ring-1 ring-black/10">
              <div className="relative aspect-[4/3] bg-black/5">
                <Image
                  src={item.src}
                  alt={item.title}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                  priority={index < 2}
                />
              </div>
              <div className="p-4">
                <h2 className="text-lg font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-moss">{item.description}</p>
              </div>
            </article>
          ))}
        </section>
      </div>
      <Footer />
    </main>
  );
}
