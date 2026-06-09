"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useCart } from "@/components/cart/cart-provider";
import { toCheckoutCartItems } from "@/lib/cart/cart-store";
import { formatCurrency } from "@/lib/format";

function createIdempotencyKey(): string {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function CheckoutForm() {
  const items = useCart((state) => state.items);
  const totals = useCart((state) => state.totals);
  const clear = useCart((state) => state.clear);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const idempotencyKey = useMemo(() => createIdempotencyKey(), []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!totals.canCheckout) {
      setStatus("error");
      setMessage("В корзине есть товары, которые оформляются только по запросу.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    setStatus("submitting");
    setMessage(null);

    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idempotencyKey,
        customer: {
          fullName: formData.get("fullName"),
          phone: formData.get("phone"),
          email: formData.get("email"),
          address: formData.get("address"),
        },
        customerNote: formData.get("customerNote"),
        items: toCheckoutCartItems(items),
      }),
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setStatus("error");
      setMessage(body.error ?? "Не удалось оформить заказ. Попробуйте ещё раз или позвоните нам.");
      return;
    }

    clear();
    setReference(body.orderReference ?? null);
    setStatus("success");
  }

  if (status === "success") {
    return (
      <div className="mx-auto max-w-2xl rounded border border-black/10 bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-moss">Заказ принят</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Мы получили вашу заявку</h1>
        <p className="mt-3 text-black/65">
          Оператор свяжется с вами, подтвердит детали и время. Номер заказа:
          <span className="ml-1 font-semibold text-ink">{reference}</span>
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded bg-ink px-5 py-3 text-sm font-semibold text-white hover:bg-moss"
        >
          Вернуться на главную
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <form onSubmit={handleSubmit} className="rounded border border-black/10 bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-moss">Оформление</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Контактные данные</h1>
        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-ink">
            Имя и фамилия
            <input
              name="fullName"
              required
              minLength={2}
              className="rounded border border-black/15 px-3 py-3 text-base outline-none focus:border-moss"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-ink">
            Телефон
            <input
              name="phone"
              required
              type="tel"
              className="rounded border border-black/15 px-3 py-3 text-base outline-none focus:border-moss"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-ink">
            Email
            <input
              name="email"
              type="email"
              className="rounded border border-black/15 px-3 py-3 text-base outline-none focus:border-moss"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-ink">
            Адрес или место церемонии
            <input
              name="address"
              className="rounded border border-black/15 px-3 py-3 text-base outline-none focus:border-moss"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-ink">
            Комментарий
            <textarea
              name="customerNote"
              rows={5}
              className="rounded border border-black/15 px-3 py-3 text-base outline-none focus:border-moss"
            />
          </label>
        </div>

        {message ? (
          <div className="mt-5 rounded border border-brass/30 bg-brass/10 p-3 text-sm text-ink">{message}</div>
        ) : null}

        <button
          type="submit"
          disabled={!totals.canCheckout || status === "submitting"}
          className="mt-6 inline-flex w-full items-center justify-center rounded bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-moss disabled:cursor-not-allowed disabled:bg-black/25"
        >
          {status === "submitting" ? "Отправляем..." : "Отправить заказ"}
        </button>
      </form>

      <aside className="rounded border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">Состав заказа</h2>
        {items.length === 0 ? (
          <p className="mt-4 text-sm text-black/60">Корзина пуста.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {items.map((item) => (
              <div key={item.key} className="border-b border-black/10 pb-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="font-medium text-ink">{item.title}</span>
                  <span className="text-black/60">x{item.quantity}</span>
                </div>
                <div className="mt-1 text-black/55">
                  {[item.variantTitle, item.materialTitle].filter(Boolean).join(", ")}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-5 flex items-center justify-between text-sm">
          <span>Итого</span>
          <span className="text-lg font-semibold text-ink">
            {formatCurrency(totals.subtotalCents, totals.currency)}
          </span>
        </div>
        {!totals.canCheckout ? (
          <p className="mt-3 text-xs text-brass">
            Добавьте товары с опубликованной ценой, чтобы оформить заказ онлайн.
          </p>
        ) : null}
      </aside>
    </div>
  );
}
