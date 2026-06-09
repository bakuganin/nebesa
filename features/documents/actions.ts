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

export type TemplateActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: {
    variables?: string;
  };
};

function parseJsonArray(formData: FormData, key: string): { data: unknown[] } | { error: string } {
  const value = formString(formData, key);

  if (!value) {
    return { data: [] };
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return { error: "Введите JSON-массив, например []." };
    }

    return { data: parsed };
  } catch {
    return { error: "Проверьте JSON: значение должно быть валидным массивом." };
  }
}

export async function saveDocumentTemplateAction(
  _state: TemplateActionState,
  formData: FormData,
): Promise<TemplateActionState> {
  const variables = parseJsonArray(formData, "variables");

  if ("error" in variables) {
    return {
      status: "error",
      message: "Шаблон не сохранен.",
      fieldErrors: {
        variables: variables.error,
      },
    };
  }

  const { supabase } = await createAuthorizedAdminClient(adminWriteRoles);
  const templateId = optionalString(formData, "id");
  const payload = {
    slug: formString(formData, "slug"),
    title: formString(formData, "title"),
    body: formString(formData, "body"),
    variables: variables.data,
    is_active: formData.get("is_active") === "on",
  };

  const request = templateId
    ? supabase.from("document_templates").update(payload).eq("id", templateId)
    : supabase.from("document_templates").insert(payload);

  const { error } = await request;

  if (error) {
    return {
      status: "error",
      message: "Не удалось сохранить шаблон. Проверьте поля и повторите попытку.",
    };
  }

  revalidatePath("/admin/documents/templates");

  return {
    status: "success",
    message: "Шаблон сохранен.",
  };
}
