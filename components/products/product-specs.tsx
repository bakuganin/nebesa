import type { ProductDetail } from "@/features/products/queries";

type SpecRow = {
  label: string;
  value: string;
};

function formatLabel(key: string): string {
  const labels: Record<string, string> = {
    dimensions: "Размер",
    size: "Размер",
    weight: "Вес",
    material: "Материал",
    color: "Цвет",
    height: "Высота",
    width: "Ширина",
    depth: "Глубина",
    capacity: "Вместимость",
    productPriceText: "Цена изделия",
    installationPriceText: "Установка",
  };

  return labels[key] ?? key.replace(/[_-]+/g, " ");
}

function stringifySpecValue(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function rowsFromObject(value: Record<string, unknown>): SpecRow[] {
  return Object.entries(value)
    .flatMap(([key, entry]) => {
      if (key === "technicalSpecs" && Array.isArray(entry)) {
        return entry.flatMap((item, index) => {
          if (!item || typeof item !== "object") return [];
          return rowsFromObject(item as Record<string, unknown>).map((row) => ({
            label: entry.length > 1 ? `${row.label} ${index + 1}` : row.label,
            value: row.value,
          }));
        });
      }

      if (key === "priceMatrix" && Array.isArray(entry)) {
        return entry.flatMap((item, index) => {
          if (!item || typeof item !== "object") return [];

          const row = item as Record<string, unknown>;
          const capacity = stringifySpecValue(row.capacity) ?? `Вариант ${index + 1}`;
          const productPrice = stringifySpecValue(row.productPriceText);
          const installationPrice = stringifySpecValue(row.installationPriceText);

          return [
            productPrice ? { label: `${capacity}: изделие`, value: productPrice } : null,
            installationPrice ? { label: `${capacity}: установка`, value: installationPrice } : null,
          ].filter((spec): spec is SpecRow => Boolean(spec));
        });
      }

      const formatted = stringifySpecValue(entry);
      return formatted ? [{ label: formatLabel(key), value: formatted }] : [];
    })
    .filter((row) => row.value.length > 0);
}

export function ProductSpecs({ product }: { product: ProductDetail }) {
  const specRows = rowsFromObject(product.specs ?? {});
  const materialRows = product.materials.map((material) => ({
    label: material.is_default ? "Материал по умолчанию" : "Материал",
    value: material.title,
  }));
  const rows = [...specRows, ...materialRows];

  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="rounded border border-black/10 bg-white p-5 shadow-sm lg:col-span-2">
      <h2 className="text-xl font-semibold text-ink">Характеристики</h2>
      <dl className="mt-4 grid gap-0 overflow-hidden rounded border border-black/10 sm:grid-cols-2">
        {rows.map((row, index) => (
          <div key={`${row.label}-${row.value}-${index}`} className="grid grid-cols-[130px_1fr] border-b border-black/10 bg-white text-sm last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0">
            <dt className="bg-mist px-3 py-3 font-medium text-ink">{row.label}</dt>
            <dd className="px-3 py-3 text-black/65">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
