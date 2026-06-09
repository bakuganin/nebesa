"use client";

import Image from "next/image";
import { useState } from "react";

import type { ProductImage } from "@/features/products/queries";

export function ProductGallery({ images, title }: { images: ProductImage[]; title: string }) {
  const sortedImages = [...images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
  const [activeId, setActiveId] = useState(sortedImages[0]?.id);
  const activeImage = sortedImages.find((image) => image.id === activeId) ?? sortedImages[0];

  if (!activeImage) {
    return <div className="aspect-[4/3] rounded bg-mist" aria-label="Нет изображения" />;
  }

  return (
    <div className="grid gap-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded bg-mist">
        <Image
          src={activeImage.url}
          alt={activeImage.alt ?? title}
          fill
          priority
          className="object-cover"
          sizes="(min-width: 1024px) 50vw, 100vw"
        />
      </div>
      {sortedImages.length > 1 ? (
        <div className="grid grid-cols-5 gap-2">
          {sortedImages.map((image) => (
            <button
              key={image.id}
              type="button"
              className={`relative aspect-square overflow-hidden rounded border ${
                image.id === activeImage.id ? "border-ink" : "border-black/10"
              }`}
              aria-label={`Показать изображение ${image.sort_order + 1}`}
              onClick={() => setActiveId(image.id)}
            >
              <Image src={image.url} alt={image.alt ?? title} fill className="object-cover" sizes="96px" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
