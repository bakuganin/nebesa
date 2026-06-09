import { NextResponse } from "next/server";

import { getActiveProducts } from "@/features/products/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category") ?? undefined;
  const page = Number(url.searchParams.get("page") ?? 1) || 1;
  const limit = Number(url.searchParams.get("limit") ?? 24) || 24;

  try {
    const result = await getActiveProducts({ category, page, limit });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { products: [], count: 0, error: "Product catalog is not available" },
      { status: 503 },
    );
  }
}
