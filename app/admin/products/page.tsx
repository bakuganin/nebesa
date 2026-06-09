import Link from "next/link";
import Image from "next/image";

import { AdminAccessNotice } from "@/components/admin/access-notice";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  formatDateTime,
  formatMoney,
  orderModeLabels,
  productStatusLabels,
  productVisibilityLabels,
} from "@/features/admin/format";
import { getAdminProductsPageData, type AdminProductListItem } from "@/features/admin/products";

function statusTone(product: AdminProductListItem): "neutral" | "success" | "warning" | "danger" {
  if (product.requires_review) {
    return "warning";
  }

  if (product.status === "active" && product.visibility === "public") {
    return "success";
  }

  if (product.status === "archived") {
    return "danger";
  }

  return "neutral";
}

const productColumns: DataTableColumn<AdminProductListItem>[] = [
  {
    header: "Товар",
    cell: (product) => (
      <div className="flex min-w-[260px] gap-3">
        {product.primaryImageUrl ? (
          <Image
            src={product.primaryImageUrl}
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 rounded-md border border-[#d8dedc] object-cover"
          />
        ) : (
          <div className="h-12 w-12 rounded-md border border-dashed border-[#cbd4d0] bg-[#f7f9f8]" />
        )}
        <div>
          <Link
            href={`/admin/products/${product.id}/edit`}
            className="font-medium text-[#1f2528] underline-offset-4 hover:underline"
          >
            {product.title}
          </Link>
          <div className="mt-1 text-xs text-[#6b7671]">{product.slug}</div>
        </div>
      </div>
    ),
  },
  {
    header: "Категория",
    cell: (product) => product.categoryTitle ?? "Без категории",
  },
  {
    header: "Статус",
    cell: (product) => (
      <div className="grid gap-1">
        <StatusBadge label={product.requires_review ? "Нужна проверка" : productStatusLabels[product.status] ?? product.status} tone={statusTone(product)} />
        <span className="text-xs text-[#6b7671]">{productVisibilityLabels[product.visibility] ?? product.visibility}</span>
      </div>
    ),
  },
  {
    header: "Заказ",
    cell: (product) => orderModeLabels[product.order_mode] ?? product.order_mode,
  },
  {
    header: "Цена",
    cell: (product) => formatMoney(product.base_price_cents, product.currency),
  },
  {
    header: "Обновлен",
    cell: (product) => formatDateTime(product.updated_at),
  },
];

export default async function AdminProductsPage() {
  const { access, data } = await getAdminProductsPageData();

  return (
    <>
      <AdminPageHeader
        title="Товары"
        description="Каталог после импорта: черновики, публичные карточки и позиции на проверке."
        actions={
          <Link href="/admin/products/new" className="rounded-md bg-[#1f2528] px-4 py-2 text-sm font-medium text-white">
            Новый товар
          </Link>
        }
      />
      <AdminAccessNotice access={access} />
      <DataTable
        columns={productColumns}
        rows={data.products}
        getRowKey={(product) => product.id}
        emptyTitle="Товары не загружены"
        emptyDescription="После импорта или ручного создания позиции появятся в этой таблице."
      />
    </>
  );
}
