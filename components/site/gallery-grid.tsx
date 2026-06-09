"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import type { GalleryItem } from "@/content/gallery";

type GalleryGridProps = {
  initialItems: GalleryItem[];
  initialPage: number;
  pageCount: number;
};

export function GalleryGrid({ initialItems, initialPage, pageCount }: GalleryGridProps) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(initialPage);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const hasMore = page < pageCount;
  const nextPage = page + 1;

  async function loadMore() {
    if (!hasMore || loading) return;

    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/gallery?page=${nextPage}`, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        setError("Не удалось загрузить следующую страницу.");
        return;
      }

      const body = (await response.json()) as {
        items: GalleryItem[];
        page: number;
      };
      setItems((current) => [...current, ...body.items]);
      setPage(body.page);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Фотографии NEBESA">
        {items.map((item, index) => (
          <article key={`${item.src}-${index}`} data-gallery-card className="overflow-hidden rounded bg-white shadow-sm ring-1 ring-black/10">
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

      {error ? <p className="mt-5 text-sm text-brass">{error}</p> : null}

      {hasMore ? (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="rounded bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-moss disabled:cursor-not-allowed disabled:bg-black/30"
          >
            {loading ? "Загрузка…" : "Показать ещё"}
          </button>
          <Link href={`/gallery?page=${nextPage}`} className="sr-only">
            Следующая страница галереи
          </Link>
        </div>
      ) : null}
    </div>
  );
}
