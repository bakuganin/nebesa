import Link from "next/link";
import Image from "next/image";

import { AdminAccessNotice } from "@/components/admin/access-notice";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { canAdminWrite } from "@/features/admin/access";
import {
  formatDateTime,
  formatMoney,
  availabilityStatusLabels,
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

function availabilityTone(product: AdminProductListItem): "neutral" | "success" | "warning" | "danger" {
  if (product.availability_status === "out_of_stock") {
    return "danger";
  }

  if (product.track_inventory && product.stock_quantity <= product.low_stock_threshold) {
    return "warning";
  }

  if (product.availability_status === "available") {
    return "success";
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
        <div className="min-w-0 flex-1">
          <Link
            href={`/admin/products/${product.id}/edit`}
            className="break-words rounded-sm font-medium text-[#1f2528] underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[#59685e]/30"
          >
            {product.title}
          </Link>
          <div className="mt-1 break-all text-xs text-[#6b7671]">{product.slug}</div>
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
    header: "Наличие",
    cell: (product) => (
      <div className="grid gap-1">
        <StatusBadge
          label={availabilityStatusLabels[product.availability_status] ?? product.availability_status}
          tone={availabilityTone(product)}
        />
        {product.allow_backorder ? <span className="text-xs text-[#6b7671]">Бэкордер разрешен</span> : null}
      </div>
    ),
  },
  {
    header: "Остаток",
    cell: (product) => (
      <span className={product.track_inventory && product.stock_quantity <= product.low_stock_threshold ? "font-medium text-[#6c4f19]" : ""}>
        {product.track_inventory ? product.stock_quantity : "Не учитывается"}
      </span>
    ),
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
  const canWrite = canAdminWrite(access);

  return (
    <>
      <AdminPageHeader
        title="Товары"
        description="Каталог после импорта: черновики, публичные карточки и позиции на проверке."
        actions={canWrite ? (
          <Link
            href="/admin/products/new"
            className="rounded-md bg-[#1f2528] px-4 py-2 text-sm font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-[#59685e]/30"
          >
            Новый товар
          </Link>
        ) : null}
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
