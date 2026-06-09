import { NextResponse } from "next/server";

import { galleryPageSize, getGalleryPage } from "@/content/gallery";

export function GET(request: Request) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? 1) || 1;
  const limit = Number(url.searchParams.get("limit") ?? galleryPageSize) || galleryPageSize;

  return NextResponse.json(getGalleryPage(page, limit));
}
