"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, Star, Trash2, Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import {
  attachProductImagesAction,
  deleteProductImageAction,
  setPrimaryProductImageAction,
  type UploadedProductImage,
} from "@/features/admin/actions";
import type { AdminProductImage } from "@/features/admin/products";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const bucketName = "product-assets";

function extensionFrom(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) {
    return fromName;
  }

  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/svg+xml") return "svg";
  return "jpg";
}

function uploadPath(productId: string, file: File, index: number): string {
  const fallbackId = `${Date.now()}-${index}`;
  const id = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : fallbackId;
  return `products/${productId}/${id}.${extensionFrom(file)}`;
}

export function ProductImagesManager({
  productId,
  images,
  disabled,
}: {
  productId: string;
  images: AdminProductImage[];
  disabled?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);

  const busy = disabled || isPending || isUploading;

  async function uploadSelectedFiles(files: FileList | null) {
    const selectedFiles = Array.from(files ?? []).filter((file) => file.type.startsWith("image/"));
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setMessage(null);

    const supabase = createBrowserSupabaseClient();
    const uploaded: UploadedProductImage[] = [];

    try {
      for (const [index, file] of selectedFiles.entries()) {
        const storagePath = uploadPath(productId, file, index);
        const { error } = await supabase.storage.from(bucketName).upload(storagePath, file, {
          cacheControl: "31536000",
          contentType: file.type || undefined,
          upsert: false,
        });

        if (error) {
          throw error;
        }

        const { data } = supabase.storage.from(bucketName).getPublicUrl(storagePath);
        uploaded.push({
          url: data.publicUrl,
          storageBucket: bucketName,
          storagePath,
          alt: file.name.replace(/\.[^.]+$/, ""),
        });
      }

      await attachProductImagesAction(productId, uploaded);
      setMessage(`Загружено фото: ${uploaded.length}`);
      router.refresh();
    } catch (error) {
      if (uploaded.length > 0) {
        await supabase.storage.from(bucketName).remove(uploaded.map((image) => image.storagePath));
      }

      setMessage(error instanceof Error ? error.message : "Не удалось загрузить фотографии");
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function setPrimary(imageId: string) {
    setMessage(null);
    startTransition(async () => {
      try {
        await setPrimaryProductImageAction(productId, imageId);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Не удалось выбрать главное фото");
      }
    });
  }

  function deleteImage(imageId: string) {
    setMessage(null);
    startTransition(async () => {
      try {
        await deleteProductImageAction(productId, imageId);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Не удалось удалить фото");
      }
    });
  }

  return (
    <section className="grid gap-4 rounded-md border border-[#d8dedc] bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#1f2528]">Фотографии товара</h2>
          <p className="mt-1 text-sm text-[#6b7671]">Можно загрузить несколько изображений сразу.</p>
        </div>
        <label
          aria-disabled={busy}
          className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md bg-[#1f2528] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2f3935] focus-within:ring-2 focus-within:ring-[#59685e]/30 aria-disabled:cursor-not-allowed aria-disabled:bg-[#9aa39f]"
        >
          <Upload aria-hidden="true" className="h-4 w-4" />
          Загрузить
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            multiple
            disabled={busy}
            aria-disabled={busy}
            onChange={(event) => {
              void uploadSelectedFiles(event.currentTarget.files);
            }}
            className="sr-only"
          />
        </label>
      </div>

      {message ? (
        <div role="status" className="rounded-md bg-[#f7f9f8] px-3 py-2 text-sm text-[#2f3935]">
          {message}
        </div>
      ) : null}

      {images.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {images.map((image) => (
            <article key={image.id} className="overflow-hidden rounded-md border border-[#d8dedc] bg-[#f7f9f8]">
              <div className="relative aspect-[4/3] bg-[#edf1ef]">
                <Image
                  src={image.url}
                  alt={image.alt ?? ""}
                  fill
                  sizes="(min-width: 1280px) 220px, (min-width: 640px) 45vw, 90vw"
                  className="object-cover"
                />
                {image.is_primary ? (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-xs font-medium text-[#1f2528] shadow-sm">
                    <Star aria-hidden="true" className="h-3 w-3 fill-[#b88a2f] text-[#b88a2f]" />
                    Главное
                  </span>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-2 p-3">
                <button
                  type="button"
                  disabled={busy || image.is_primary}
                  onClick={() => setPrimary(image.id)}
                  className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[#cbd4d0] bg-white px-3 py-1.5 text-sm font-medium text-[#1f2528] transition hover:border-[#59685e] disabled:cursor-not-allowed disabled:text-[#8a948f]"
                >
                  <Star aria-hidden="true" className="h-4 w-4" />
                  Главное
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => deleteImage(image.id)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#e2b7b7] bg-white text-[#742c2c] transition hover:bg-[#fff0f0] disabled:cursor-not-allowed disabled:text-[#b88686]"
                  aria-label="Удалить фото"
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="grid min-h-36 place-items-center rounded-md border border-dashed border-[#cbd4d0] bg-[#f7f9f8] p-6 text-center text-sm text-[#6b7671]">
          <div className="grid justify-items-center gap-2">
            <ImagePlus aria-hidden="true" className="h-8 w-8 text-[#8a948f]" />
            Фотографии пока не добавлены
          </div>
        </div>
      )}
    </section>
  );
}
