import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/site/footer";
import { GalleryGrid } from "@/components/site/gallery-grid";
import { Header } from "@/components/site/header";
import { getGalleryPage } from "@/content/gallery";

export const metadata: Metadata = {
  title: "Галерея работ | NEBESA",
  description: "Фотографии памятников, залов прощания и ритуальной продукции NEBESA.",
};

type GalleryPageProps = {
  searchParams: {
    page?: string;
  };
};

export default function GalleryPage({ searchParams }: GalleryPageProps) {
  const requestedPage = Math.max(1, Number(searchParams.page ?? 1) || 1);
  const gallery = getGalleryPage(requestedPage);

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

        <GalleryGrid initialItems={gallery.items} initialPage={gallery.page} pageCount={gallery.pageCount} />
      </div>
      <Footer />
    </main>
  );
}
