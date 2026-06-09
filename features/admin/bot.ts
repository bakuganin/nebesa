import "server-only";

import { adminReadRoles } from "./access";
import { runAdminQuery, type AdminQueryResult } from "./safe-query";

export type WhatsAppTemplateRow = {
  id: string;
  slug: string;
  title: string;
  body: string;
  variables: unknown;
  is_active: boolean;
  updated_at: string;
};

export type WhatsAppEventRow = {
  id: string;
  direction: string;
  event_type: string;
  phone: string | null;
  processed_at: string | null;
  created_at: string;
};

export type AdminBotPageData = {
  templates: WhatsAppTemplateRow[];
  events: WhatsAppEventRow[];
};

const emptyBotPageData: AdminBotPageData = {
  templates: [],
  events: [],
};

export async function getAdminBotPageData(): Promise<AdminQueryResult<AdminBotPageData>> {
  return runAdminQuery(emptyBotPageData, async ({ supabase }) => {
    const templatesPromise = supabase
      .from("whatsapp_templates")
      .select("id, slug, title, body, variables, is_active, updated_at")
      .order("updated_at", { ascending: false })
      .limit(25);

    const eventsPromise = supabase
      .from("whatsapp_events")
      .select("id, direction, event_type, phone, processed_at, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    const [templatesResult, eventsResult] = await Promise.all([templatesPromise, eventsPromise]);

    if (templatesResult.error) {
      throw templatesResult.error;
    }

    if (eventsResult.error) {
      throw eventsResult.error;
    }

    return {
      templates: (templatesResult.data ?? []) as WhatsAppTemplateRow[],
      events: (eventsResult.data ?? []) as WhatsAppEventRow[],
    };
  }, adminReadRoles);
}
