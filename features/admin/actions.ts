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

  return {
    category_id: optionalString(formData, "category_id"),
    title,
    slug,
    short_description: optionalString(formData, "short_description"),
    description: optionalString(formData, "description"),
    status: safeChoice(formString(formData, "status"), ["draft", "active", "inactive", "archived"], "draft"),
    visibility: safeChoice(formString(formData, "visibility"), ["private", "public"], "private"),
    order_mode: safeChoice(formString(formData, "order_mode"), ["disabled", "priced", "inquiry_only"], "disabled"),
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

  const { error } = await supabase.from("products").update(payload).eq("id", productId);

  if (error) {
    throw error;
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}/edit`);
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
