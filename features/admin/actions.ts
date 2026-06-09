"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { adminWriteRoles } from "@/features/admin/access";
import { createAuthorizedAdminClient } from "@/lib/supabase/admin";

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalString(formData: FormData, key: string): string | null {
  const value = formString(formData, key);
  return value.length > 0 ? value : null;
}

function formInt(formData: FormData, key: string): number {
  const value = Number.parseInt(formString(formData, key) || "0", 10);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function slugFrom(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function centsFrom(value: string): number | null {
  if (!value) {
    return null;
  }

  const normalized = Number(value.replace(",", "."));
  return Number.isFinite(normalized) ? Math.round(normalized * 100) : null;
}

function safeChoice(value: string, allowed: readonly string[], fallback: string): string {
  return allowed.includes(value) ? value : fallback;
}

function productPayload(formData: FormData) {
  const title = formString(formData, "title");
  const slug = formString(formData, "slug") || slugFrom(title);
  const basePriceCents = centsFrom(formString(formData, "base_price_eur"));
  const priceKind = safeChoice(formString(formData, "price_kind"), ["none", "fixed", "from", "request"], "request");
  const requestedOrderMode = safeChoice(formString(formData, "order_mode"), ["disabled", "priced", "inquiry_only"], "disabled");
  const orderMode =
    requestedOrderMode === "priced" && (basePriceCents == null || priceKind !== "fixed")
      ? "inquiry_only"
      : requestedOrderMode;

  return {
    category_id: optionalString(formData, "category_id"),
    title,
    slug,
    short_description: optionalString(formData, "short_description"),
    description: optionalString(formData, "description"),
    status: safeChoice(formString(formData, "status"), ["draft", "active", "inactive", "archived"], "draft"),
    visibility: safeChoice(formString(formData, "visibility"), ["private", "public"], "private"),
    order_mode: orderMode,
    availability_status: safeChoice(
      formString(formData, "availability_status"),
      ["available", "out_of_stock", "made_to_order"],
      "available",
    ),
    track_inventory: formData.get("track_inventory") === "on",
    stock_quantity: formInt(formData, "stock_quantity"),
    low_stock_threshold: formInt(formData, "low_stock_threshold"),
    allow_backorder: formData.get("allow_backorder") === "on",
    requires_review: formData.get("requires_review") === "on",
    base_price_cents: basePriceCents,
    price_kind: priceKind,
    price_note: optionalString(formData, "price_note"),
    currency: (formString(formData, "currency") || "EUR").toUpperCase().slice(0, 3),
    sort_order: Number.parseInt(formString(formData, "sort_order") || "0", 10) || 0,
    published_at: formString(formData, "status") === "active" ? new Date().toISOString() : null,
  };
}

export async function createProductDraftAction(formData: FormData): Promise<void> {
  const { supabase } = await createAuthorizedAdminClient(adminWriteRoles);
  const payload = productPayload(formData);

  const { data, error } = await supabase.from("products").insert(payload).select("id").single();

  if (error) {
    throw error;
  }

  revalidatePath("/admin/products");
  redirect(`/admin/products/${data.id}/edit`);
}

export async function updateProductDraftAction(productId: string, formData: FormData): Promise<void> {
  const { supabase } = await createAuthorizedAdminClient(adminWriteRoles);
  const payload = productPayload(formData);
  const { data: previous, error: previousError } = await supabase
    .from("products")
    .select("stock_quantity")
    .eq("id", productId)
    .maybeSingle();

  if (previousError) {
    throw previousError;
  }

  const { error } = await supabase.from("products").update(payload).eq("id", productId);

  if (error) {
    throw error;
  }

  const previousStock = typeof previous?.stock_quantity === "number" ? previous.stock_quantity : null;
  if (previousStock !== null && previousStock !== payload.stock_quantity) {
    const { error: movementError } = await supabase.from("product_stock_movements").insert({
      product_id: productId,
      delta: payload.stock_quantity - previousStock,
      resulting_quantity: payload.stock_quantity,
      reason: "manual_admin_adjustment",
      note: optionalString(formData, "stock_note"),
    });

    if (movementError) {
      throw movementError;
    }
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/products");
  revalidatePath(`/products/${payload.slug}`);
}

export async function deleteProductAction(productId: string, formData: FormData): Promise<void> {
  const { supabase, profile } = await createAuthorizedAdminClient(adminWriteRoles);
  const note = optionalString(formData, "delete_note");

  const { error } = await supabase
    .from("products")
    .update({
      status: "archived",
      visibility: "private",
      order_mode: "disabled",
      deleted_at: new Date().toISOString(),
      deleted_by: profile.user_id,
      delete_note: note,
    })
    .eq("id", productId);

  if (error) {
    throw error;
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/products");
}

export type UploadedProductImage = {
  url: string;
  storageBucket: string;
  storagePath: string;
  alt?: string;
};

export async function attachProductImagesAction(productId: string, images: UploadedProductImage[]): Promise<void> {
  const { supabase } = await createAuthorizedAdminClient(adminWriteRoles);

  if (images.length === 0) return;

  const { data: currentImages, error: currentError } = await supabase
    .from("product_images")
    .select("id, sort_order, is_primary")
    .eq("product_id", productId)
    .order("sort_order", { ascending: false });

  if (currentError) {
    throw currentError;
  }

  const current = currentImages ?? [];
  const nextSortOrder = (current[0]?.sort_order ?? -1) + 1;
  const hasPrimary = current.some((image) => image.is_primary);
  const rows = images.map((image, index) => ({
    product_id: productId,
    url: image.url,
    storage_bucket: image.storageBucket,
    storage_path: image.storagePath,
    alt: image.alt ?? null,
    sort_order: nextSortOrder + index,
    is_primary: !hasPrimary && index === 0,
  }));

  const { error } = await supabase.from("product_images").insert(rows);

  if (error) {
    throw error;
  }

  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/admin/products");
  revalidatePath("/products");
}

export async function setPrimaryProductImageAction(productId: string, imageId: string): Promise<void> {
  const { supabase } = await createAuthorizedAdminClient(adminWriteRoles);

  const { error: clearError } = await supabase
    .from("product_images")
    .update({ is_primary: false })
    .eq("product_id", productId);

  if (clearError) {
    throw clearError;
  }

  const { error } = await supabase
    .from("product_images")
    .update({ is_primary: true })
    .eq("id", imageId)
    .eq("product_id", productId);

  if (error) {
    throw error;
  }

  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/admin/products");
  revalidatePath("/products");
}

export async function deleteProductImageAction(productId: string, imageId: string): Promise<void> {
  const { supabase } = await createAuthorizedAdminClient(adminWriteRoles);
  const { data: image, error: loadError } = await supabase
    .from("product_images")
    .select("id, storage_bucket, storage_path, is_primary")
    .eq("id", imageId)
    .eq("product_id", productId)
    .maybeSingle();

  if (loadError) {
    throw loadError;
  }

  if (!image) return;

  const { error } = await supabase.from("product_images").delete().eq("id", imageId).eq("product_id", productId);

  if (error) {
    throw error;
  }

  if (image.storage_path) {
    await supabase.storage.from(image.storage_bucket).remove([image.storage_path]);
  }

  if (image.is_primary) {
    const { data: nextImage } = await supabase
      .from("product_images")
      .select("id")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextImage?.id) {
      await supabase.from("product_images").update({ is_primary: true }).eq("id", nextImage.id);
    }
  }

  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/admin/products");
  revalidatePath("/products");
}

export async function upsertCategoryAction(formData: FormData): Promise<void> {
  const { supabase } = await createAuthorizedAdminClient(adminWriteRoles);
  const categoryId = optionalString(formData, "id");
  const title = formString(formData, "title");
  const payload = {
    parent_id: optionalString(formData, "parent_id"),
    title,
    slug: formString(formData, "slug") || slugFrom(title),
    description: optionalString(formData, "description"),
    sort_order: Number.parseInt(formString(formData, "sort_order") || "0", 10) || 0,
    is_active: formData.get("is_active") === "on",
  };

  const request = categoryId
    ? supabase.from("product_categories").update(payload).eq("id", categoryId)
    : supabase.from("product_categories").insert(payload);

  const { error } = await request;

  if (error) {
    throw error;
  }

  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
}

export async function updateOrderStatusAction(orderId: string, formData: FormData): Promise<void> {
  const { supabase, profile } = await createAuthorizedAdminClient(adminWriteRoles);
  const status = safeChoice(
    formString(formData, "status"),
    ["new", "confirmed", "in_progress", "completed", "cancelled"],
    "new",
  );
  const note = optionalString(formData, "note");

  const { error: orderError } = await supabase
    .from("orders")
    .update({
      status,
      internal_note: note,
    })
    .eq("id", orderId);

  if (orderError) {
    throw orderError;
  }

  const { error: eventError } = await supabase.from("order_status_events").insert({
    order_id: orderId,
    status,
    note,
    created_by: profile.user_id,
  });

  if (eventError) {
    throw eventError;
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}
