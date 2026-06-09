import { NextResponse } from "next/server";

import { adminReadRoles } from "@/features/admin/access";
import { createAuthorizedAdminClient } from "@/lib/supabase/admin";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { supabase } = await createAuthorizedAdminClient(adminReadRoles);
    const { data: document, error: documentError } = await supabase
      .from("generated_documents")
      .select("storage_bucket, storage_path")
      .eq("id", params.id)
      .maybeSingle();

    if (documentError) {
      throw documentError;
    }

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const { data, error } = await supabase.storage
      .from(document.storage_bucket)
      .createSignedUrl(document.storage_path, 60, { download: true });

    if (error) {
      throw error;
    }

    return NextResponse.redirect(data.signedUrl);
  } catch {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
}
