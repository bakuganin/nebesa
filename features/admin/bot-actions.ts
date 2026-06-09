"use server";

import { revalidatePath } from "next/cache";

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

function jsonArray(formData: FormData, key: string): unknown[] {
  const value = formString(formData, key);

  if (!value) {
    return [];
  }

  const parsed = JSON.parse(value) as unknown;
  return Array.isArray(parsed) ? parsed : [];
}

export async function saveWhatsAppTemplateAction(formData: FormData): Promise<void> {
  const { supabase } = await createAuthorizedAdminClient(adminWriteRoles);
  const templateId = optionalString(formData, "id");
  const payload = {
    slug: formString(formData, "slug"),
    title: formString(formData, "title"),
    body: formString(formData, "body"),
    variables: jsonArray(formData, "variables"),
    is_active: formData.get("is_active") === "on",
  };

  const request = templateId
    ? supabase.from("whatsapp_templates").update(payload).eq("id", templateId)
    : supabase.from("whatsapp_templates").insert(payload);

  const { error } = await request;

  if (error) {
    throw error;
  }

  revalidatePath("/admin/bot");
}
