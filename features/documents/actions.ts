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

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textParagraph(value: string): string {
  return `<w:p><w:r><w:t xml:space="preserve">${xmlEscape(value)}</w:t></w:r></w:p>`;
}

function wordDocumentXml(text: string): string {
  const paragraphs = text.split(/\r?\n/).map((line) => textParagraph(line));

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs.join("\n    ")}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function dosTimestamp(date: Date): { time: number; date: number } {
  const year = Math.max(1980, date.getFullYear());

  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function zipEntries(entries: Array<{ path: string; content: string }>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  const stamp = dosTimestamp(new Date());

  for (const entry of entries) {
    const name = Buffer.from(entry.path, "utf8");
    const data = Buffer.from(entry.content, "utf8");
    const crc = crc32(data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(stamp.time, 10);
    localHeader.writeUInt16LE(stamp.date, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, name, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(stamp.time, 12);
    centralHeader.writeUInt16LE(stamp.date, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, name);

    offset += localHeader.length + name.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

function createDocxBuffer(text: string): Buffer {
  return zipEntries([
    {
      path: "[Content_Types].xml",
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    },
    {
      path: "_rels/.rels",
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    },
    {
      path: "word/document.xml",
      content: wordDocumentXml(text),
    },
    {
      path: "word/_rels/document.xml.rels",
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>',
    },
  ]);
}

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("ru-EE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function snapshotString(snapshot: unknown, key: string): string | null {
  if (!snapshot || typeof snapshot !== "object") return null;

  const value = (snapshot as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function replaceVariables(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => variables[key] ?? "");
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

type OrderDocumentRow = {
  id: string;
  order_reference: string;
  subtotal_cents: number;
  total_cents: number;
  currency: string;
  customer_note: string | null;
  internal_note: string | null;
  created_at: string;
  customer:
    | {
        full_name: string;
        phone: string;
        email: string | null;
        address: string | null;
      }
    | Array<{
        full_name: string;
        phone: string;
        email: string | null;
        address: string | null;
      }>
    | null;
  items: Array<{
    quantity: number;
    unit_price_cents: number;
    line_total_cents: number;
    currency: string;
    product_snapshot: Record<string, unknown>;
    variant_snapshot: Record<string, unknown> | null;
    material_snapshot: Record<string, unknown> | null;
  }>;
};

type TemplateRow = {
  id: string;
  slug: string;
  title: string;
  body: string;
};

function normalizeCustomer(order: OrderDocumentRow) {
  return Array.isArray(order.customer) ? order.customer[0] : order.customer;
}

function documentVariables(order: OrderDocumentRow): Record<string, string> {
  const customer = normalizeCustomer(order);
  const createdAt = new Intl.DateTimeFormat("ru-EE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(order.created_at));

  const items = order.items
    .map((item) => {
      const title = snapshotString(item.product_snapshot, "title") ?? "Позиция";
      const variantTitle = snapshotString(item.variant_snapshot, "title");
      const materialTitle = snapshotString(item.material_snapshot, "title");
      const details = [variantTitle, materialTitle].filter(Boolean).join(", ");
      const label = details ? `${title} (${details})` : title;

      return `${item.quantity} x ${label} - ${formatMoney(item.line_total_cents, item.currency)}`;
    })
    .join("\n");

  return {
    order_reference: order.order_reference,
    order_date: createdAt,
    customer_name: customer?.full_name ?? "",
    customer_phone: customer?.phone ?? "",
    customer_email: customer?.email ?? "",
    customer_address: customer?.address ?? "",
    customer_note: order.customer_note ?? "",
    internal_note: order.internal_note ?? "",
    subtotal: formatMoney(order.subtotal_cents, order.currency),
    total: formatMoney(order.total_cents, order.currency),
    items,
  };
}

export async function generateOrderDocumentAction(orderId: string, formData: FormData): Promise<void> {
  const { supabase, profile } = await createAuthorizedAdminClient(adminWriteRoles);
  const templateId = formString(formData, "template_id");

  if (!templateId) {
    throw new Error("Выберите шаблон документа.");
  }

  const [orderResult, templateResult] = await Promise.all([
    supabase
      .from("orders")
      .select(
        `
          id,
          order_reference,
          subtotal_cents,
          total_cents,
          currency,
          customer_note,
          internal_note,
          created_at,
          customer:customers(full_name, phone, email, address),
          items:order_items(
            quantity,
            unit_price_cents,
            line_total_cents,
            currency,
            product_snapshot,
            variant_snapshot,
            material_snapshot
          )
        `,
      )
      .eq("id", orderId)
      .maybeSingle(),
    supabase
      .from("document_templates")
      .select("id, slug, title, body")
      .eq("id", templateId)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  if (orderResult.error) {
    throw orderResult.error;
  }

  if (templateResult.error) {
    throw templateResult.error;
  }

  if (!orderResult.data) {
    throw new Error("Заказ не найден.");
  }

  if (!templateResult.data) {
    throw new Error("Активный шаблон не найден.");
  }

  const order = orderResult.data as unknown as OrderDocumentRow;
  const template = templateResult.data as TemplateRow;
  const rendered = replaceVariables(template.body, documentVariables(order));
  const file = createDocxBuffer(rendered);
  const storageBucket = "generated-documents";
  const storagePath = `orders/${order.order_reference}/${template.slug}-${Date.now()}.docx`;

  const { error: uploadError } = await supabase.storage.from(storageBucket).upload(storagePath, file, {
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    upsert: false,
  });

  if (uploadError) {
    throw uploadError;
  }

  const { error: documentError } = await supabase.from("generated_documents").insert({
    order_id: orderId,
    template_id: template.id,
    storage_bucket: storageBucket,
    storage_path: storagePath,
    created_by: profile.user_id,
    metadata: {
      orderReference: order.order_reference,
      templateSlug: template.slug,
      templateTitle: template.title,
    },
  });

  if (documentError) {
    await supabase.storage.from(storageBucket).remove([storagePath]);
    throw documentError;
  }

  revalidatePath("/admin/documents");
  revalidatePath(`/admin/orders/${orderId}`);
}
