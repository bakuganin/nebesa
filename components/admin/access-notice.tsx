import Link from "next/link";

import type { AdminAccessState } from "@/features/admin/access";

export function AdminAccessNotice({ access }: { access: AdminAccessState }) {
  if (access.status === "ready") {
    return null;
  }

  return (
    <div className="mb-5 rounded-md border border-[#d8dedc] bg-white p-4">
      <div className="text-sm font-semibold text-[#1f2528]">Данные админки недоступны</div>
      <p className="mt-1 text-sm text-[#59685e]">{access.message}</p>
      {access.status === "not_configured" ? (
        <div className="mt-3 text-xs text-[#6b7671]">
          Не хватает: <span className="font-mono">{access.missing.join(", ")}</span>
        </div>
      ) : null}
      {access.status === "unauthenticated" ? (
        <Link
          href="/admin/login"
          className="mt-3 inline-flex rounded-md bg-[#1f2528] px-3 py-2 text-sm font-medium text-white"
        >
          Открыть вход
        </Link>
      ) : null}
    </div>
  );
}
