"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function LogoutButton() {
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    if (pending) {
      return;
    }

    setPending(true);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      setPending(false);
      return;
    }

    window.location.assign("/admin/login");
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[#cbd4d0] bg-white px-3 py-2 text-sm font-medium text-[#1f2528] outline-none transition hover:bg-[#f4f6f5] focus-visible:ring-2 focus-visible:ring-[#59685e]/30 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <LogOut aria-hidden="true" className="h-4 w-4" />
      {pending ? "Выход..." : "Выйти"}
    </button>
  );
}
