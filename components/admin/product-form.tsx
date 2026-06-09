import type { AdminCategory, AdminProductFormRecord } from "@/features/admin/products";

import { FormField, inputClassName } from "./form-field";

export function ProductForm({
  product,
  categories,
  action,
  disabled,
  submitLabel,
}: {
  product?: AdminProductFormRecord | null;
  categories: AdminCategory[];
  action: (formData: FormData) => Promise<void>;
  disabled?: boolean;
  submitLabel: string;
}) {
  const priceValue =
    typeof product?.base_price_cents === "number" ? String(product.base_price_cents / 100) : "";

  return (
    <form action={disabled ? undefined : action} className="grid gap-5">
      <fieldset disabled={disabled} className="grid gap-5">
        <div className="grid gap-4 rounded-md border border-[#d8dedc] bg-white p-5 lg:grid-cols-2">
          <FormField label="Название" htmlFor="product-title">
            <input
              id="product-title"
              name="title"
              required
              defaultValue={product?.title ?? ""}
              className={inputClassName}
            />
          </FormField>
          <FormField label="Slug" htmlFor="product-slug" help="Если оставить пустым, slug будет создан из названия.">
            <input id="product-slug" name="slug" defaultValue={product?.slug ?? ""} className={inputClassName} />
          </FormField>
          <FormField label="Категория" htmlFor="product-category">
            <select
              id="product-category"
              name="category_id"
              defaultValue={product?.category_id ?? ""}
              className={inputClassName}
            >
              <option value="">Без категории</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.title}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Сортировка" htmlFor="product-sort-order">
            <input
              id="product-sort-order"
              name="sort_order"
              type="number"
              min="0"
              defaultValue={product?.sort_order ?? 0}
              className={inputClassName}
            />
          </FormField>
          <FormField label="Короткое описание" htmlFor="product-short-description">
            <textarea
              id="product-short-description"
              name="short_description"
              rows={3}
              defaultValue={product?.short_description ?? ""}
              className={inputClassName}
            />
          </FormField>
          <FormField label="Описание" htmlFor="product-description">
            <textarea
              id="product-description"
              name="description"
              rows={3}
              defaultValue={product?.description ?? ""}
              className={inputClassName}
            />
          </FormField>
        </div>
        <div className="grid gap-4 rounded-md border border-[#d8dedc] bg-white p-5 lg:grid-cols-3">
          <FormField label="Статус" htmlFor="product-status">
            <select id="product-status" name="status" defaultValue={product?.status ?? "draft"} className={inputClassName}>
              <option value="draft">Черновик</option>
              <option value="active">Активен</option>
              <option value="inactive">Скрыт</option>
              <option value="archived">Архив</option>
            </select>
          </FormField>
          <FormField label="Видимость" htmlFor="product-visibility">
            <select
              id="product-visibility"
              name="visibility"
              defaultValue={product?.visibility ?? "private"}
              className={inputClassName}
            >
              <option value="private">Приватно</option>
              <option value="public">Публично</option>
            </select>
          </FormField>
          <FormField label="Режим заказа" htmlFor="product-order-mode">
            <select
              id="product-order-mode"
              name="order_mode"
              defaultValue={product?.order_mode ?? "disabled"}
              className={inputClassName}
            >
              <option value="disabled">Без заказа</option>
              <option value="priced">В корзину</option>
              <option value="inquiry_only">Заявка</option>
            </select>
          </FormField>
          <FormField label="Цена, EUR" htmlFor="product-price">
            <input
              id="product-price"
              name="base_price_eur"
              type="number"
              step="0.01"
              min="0"
              defaultValue={priceValue}
              className={inputClassName}
            />
          </FormField>
          <FormField label="Тип цены" htmlFor="product-price-kind">
            <select
              id="product-price-kind"
              name="price_kind"
              defaultValue={product?.price_kind ?? "request"}
              className={inputClassName}
            >
              <option value="none">Не указана</option>
              <option value="fixed">Фиксированная</option>
              <option value="from">От</option>
              <option value="request">По запросу</option>
            </select>
          </FormField>
          <FormField label="Валюта" htmlFor="product-currency">
            <input
              id="product-currency"
              name="currency"
              maxLength={3}
              defaultValue={product?.currency ?? "EUR"}
              className={inputClassName}
            />
          </FormField>
          <div className="lg:col-span-3">
            <FormField label="Примечание к цене" htmlFor="product-price-note">
              <input
                id="product-price-note"
                name="price_note"
                defaultValue={product?.price_note ?? ""}
                className={inputClassName}
              />
            </FormField>
          </div>
          <label className="flex items-center gap-3 text-sm font-medium text-[#1f2528] lg:col-span-3">
            <input
              name="requires_review"
              type="checkbox"
              defaultChecked={product?.requires_review ?? true}
              className="h-4 w-4 rounded border-[#cbd4d0]"
            />
            Требует проверки перед публикацией
          </label>
        </div>
      </fieldset>
      <div>
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#1f2528] px-4 py-2 text-sm font-medium text-white outline-none transition hover:bg-[#2f3935] focus-visible:ring-2 focus-visible:ring-[#59685e]/30 disabled:cursor-not-allowed disabled:bg-[#9aa39f]"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
