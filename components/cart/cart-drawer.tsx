"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { useState } from "react";

import { useCart } from "@/components/cart/cart-provider";
import { formatCurrency } from "@/lib/format";

export function CartDrawer() {
  const [open, setOpen] = useState(false);
  const items = useCart((state) => state.items);
  const totals = useCart((state) => state.totals);
  const updateQuantity = useCart((state) => state.updateQuantity);
  const removeItem = useCart((state) => state.removeItem);

  return (
    <>
      <button
        type="button"
        className="fixed bottom-5 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white shadow-lg transition hover:bg-moss"
        aria-label="Открыть корзину"
        onClick={() => setOpen(true)}
      >
        <ShoppingCart size={22} />
        {totals.itemCount > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-6 rounded-full bg-brass px-1.5 py-0.5 text-center text-xs font-semibold text-white">
            {totals.itemCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Закрыть корзину"
            className="absolute inset-0 bg-black/35"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-moss">Заказ</p>
                <h2 className="text-xl font-semibold text-ink">Корзина</h2>
              </div>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-ink hover:bg-mist"
                aria-label="Закрыть"
                onClick={() => setOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <div className="rounded border border-dashed border-black/20 bg-mist p-5 text-sm text-ink">
                  Корзина пуста. Добавьте опубликованные товары из каталога.
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.key} className="grid grid-cols-[72px_1fr] gap-3 border-b border-black/10 pb-4">
                      <div className="relative h-[72px] overflow-hidden rounded bg-mist">
                        {item.imageUrl ? (
                          <Image src={item.imageUrl} alt={item.title} fill className="object-cover" sizes="72px" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                            <p className="mt-1 text-xs text-black/55">
                              {[item.variantTitle, item.materialTitle]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="text-black/45 hover:text-ink"
                            aria-label="Удалить"
                            onClick={() => removeItem(item.key)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        {item.options?.length ? (
                          <p className="mt-2 text-xs text-black/55">
                            {item.options.map((option) => option.valueTitle).join(", ")}
                          </p>
                        ) : null}
                        <div className="mt-3 flex items-center justify-between">
                          <div className="inline-flex items-center rounded border border-black/10">
                            <button
                              type="button"
                              className="h-8 w-8 text-ink hover:bg-mist"
                              aria-label="Уменьшить"
                              onClick={() => updateQuantity(item.key, item.quantity - 1)}
                            >
                              <Minus size={14} className="mx-auto" />
                            </button>
                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                            <button
                              type="button"
                              className="h-8 w-8 text-ink hover:bg-mist"
                              aria-label="Увеличить"
                              onClick={() => updateQuantity(item.key, item.quantity + 1)}
                            >
                              <Plus size={14} className="mx-auto" />
                            </button>
                          </div>
                          <span className="text-sm font-semibold text-ink">
                            {formatCurrency(item.unitPriceCents, item.currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-black/10 p-5">
              <div className="flex items-center justify-between text-sm text-black/65">
                <span>Итого</span>
                <span className="text-lg font-semibold text-ink">
                  {formatCurrency(totals.subtotalCents, totals.currency)}
                </span>
              </div>
              {totals.hasInquiryItems ? (
                <p className="mt-2 text-xs text-brass">
                  Товары с ценой по запросу оформляются через звонок оператору.
                </p>
              ) : null}
              <Link
                href="/checkout"
                className="mt-4 inline-flex w-full items-center justify-center rounded bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-moss"
                onClick={() => setOpen(false)}
              >
                Перейти к оформлению
              </Link>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
