"use client";

import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { safeAdminRedirect } from "@/lib/admin-redirect";

import { FormField, inputClassName } from "./form-field";

export function LoginForm({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!enabled || pending) {
      return;
    }

    setPending(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setMessage(error.message);
        setPending(false);
        return;
      }

      router.push(safeAdminRedirect(searchParams.get("next")));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось выполнить вход.");
      setPending(false);
    }
  }

  return (
    <form method="post" onSubmit={onSubmit} className="grid max-w-lg gap-4 rounded-md border border-[#d8dedc] bg-white p-5">
      <FormField label="Email" htmlFor="admin-email">
        <input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={!enabled || pending}
          className={inputClassName}
        />
      </FormField>
      <FormField label="Пароль" htmlFor="admin-password">
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={!enabled || pending}
          className={inputClassName}
        />
      </FormField>
      {message ? <div className="rounded-md bg-[#fff0f0] px-3 py-2 text-sm text-[#742c2c]">{message}</div> : null}
      <button
        type="submit"
        disabled={!enabled || pending}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#1f2528] px-4 py-2 text-sm font-medium text-white outline-none transition hover:bg-[#2f3935] focus-visible:ring-2 focus-visible:ring-[#59685e]/30 disabled:cursor-not-allowed disabled:bg-[#9aa39f]"
      >
        {pending ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
        Войти
      </button>
    </form>
  );
}
