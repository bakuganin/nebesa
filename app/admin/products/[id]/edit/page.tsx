import { EmptyState } from "@/components/admin/empty-state";
import { AdminAccessNotice } from "@/components/admin/access-notice";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { ProductImagesManager } from "@/components/admin/product-images-manager";
import { deleteProductAction, updateProductDraftAction } from "@/features/admin/actions";
import { canAdminWrite } from "@/features/admin/access";
import { getAdminProductFormData } from "@/features/admin/products";

export default async function AdminEditProductPage({ params }: { params: { id: string } }) {
  const { access, data } = await getAdminProductFormData(params.id);
  const action = updateProductDraftAction.bind(null, params.id);
  const deleteAction = deleteProductAction.bind(null, params.id);
  const canWrite = canAdminWrite(access);

  return (
    <>
      <AdminPageHeader title="Редактирование товара" description="Основные поля каталожной позиции." />
      <AdminAccessNotice access={access} />
      {data.product ? (
        <div className="grid gap-6">
          <ProductForm
            product={data.product}
            categories={data.categories}
            action={action}
            disabled={!canWrite}
            submitLabel="Сохранить"
          />
          <ProductImagesManager productId={params.id} images={data.images} disabled={!canWrite} />
          <section className="grid gap-4 rounded-md border border-[#e2b7b7] bg-white p-5">
            <div>
              <h2 className="text-base font-semibold text-[#742c2c]">Архивирование товара</h2>
              <p className="mt-1 text-sm text-[#6b7671]">
                Товар станет приватным, заказ будет отключен, запись останется в админке.
              </p>
            </div>
            <form action={canWrite ? deleteAction : undefined} className="grid gap-3">
              <fieldset disabled={!canWrite} className="grid gap-3">
                <label className="grid gap-2 text-sm text-[#1f2528]" htmlFor="delete-note">
                  <span className="font-medium">Причина</span>
                  <textarea
                    id="delete-note"
                    name="delete_note"
                    rows={3}
                    className="min-h-10 w-full rounded-md border border-[#cbd4d0] bg-white px-3 py-2 text-sm text-[#1f2528] outline-none transition placeholder:text-[#8a948f] focus:border-[#59685e] focus:ring-2 focus:ring-[#59685e]/20 disabled:bg-[#eef2f0] disabled:text-[#7d8782]"
                  />
                </label>
                <button
                  type="submit"
                  disabled={!canWrite || data.product.status === "archived"}
                  className="inline-flex min-h-10 w-fit items-center justify-center rounded-md border border-[#e2b7b7] bg-[#fff0f0] px-4 py-2 text-sm font-medium text-[#742c2c] outline-none transition hover:bg-[#ffe4e4] focus-visible:ring-2 focus-visible:ring-[#742c2c]/20 disabled:cursor-not-allowed disabled:bg-[#f1e8e8] disabled:text-[#b88686]"
                >
                  {data.product.status === "archived" ? "Уже в архиве" : "Архивировать"}
                </button>
              </fieldset>
            </form>
          </section>
        </div>
      ) : (
        <EmptyState title="Товар не найден" description="Проверьте ссылку или откройте список товаров." />
      )}
    </>
  );
}
