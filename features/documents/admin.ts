import "server-only";

import { adminReadRoles } from "@/features/admin/access";
import { runAdminQuery, type AdminQueryResult } from "@/features/admin/safe-query";

export type DocumentTemplateRow = {
  id: string;
  slug: string;
  title: string;
  body: string;
  variables: unknown;
  is_active: boolean;
  updated_at: string;
};

export type GeneratedDocumentRow = {
  id: string;
  order_id: string | null;
  template_id: string | null;
  storage_bucket: string;
  storage_path: string;
  created_at: string;
};

export type AdminDocumentsPageData = {
  documents: GeneratedDocumentRow[];
};

export type AdminDocumentTemplatesPageData = {
  templates: DocumentTemplateRow[];
};

const emptyDocumentsPageData: AdminDocumentsPageData = {
  documents: [],
};

const emptyTemplatesPageData: AdminDocumentTemplatesPageData = {
  templates: [],
};

export async function getAdminDocumentsPageData(): Promise<AdminQueryResult<AdminDocumentsPageData>> {
  return runAdminQuery(emptyDocumentsPageData, async ({ supabase }) => {
    const { data, error } = await supabase
      .from("generated_documents")
      .select("id, order_id, template_id, storage_bucket, storage_path, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    return {
      documents: (data ?? []) as GeneratedDocumentRow[],
    };
  }, adminReadRoles);
}

export async function getAdminDocumentTemplatesPageData(): Promise<
  AdminQueryResult<AdminDocumentTemplatesPageData>
> {
  return runAdminQuery(emptyTemplatesPageData, async ({ supabase }) => {
    const { data, error } = await supabase
      .from("document_templates")
      .select("id, slug, title, body, variables, is_active, updated_at")
      .order("updated_at", { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    return {
      templates: (data ?? []) as DocumentTemplateRow[],
    };
  }, adminReadRoles);
}
