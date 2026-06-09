import { EmptyState } from "@/components/admin/empty-state";
import { AdminAccessNotice } from "@/components/admin/access-notice";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { updateProductDraftAction } from "@/features/admin/actions";
import { canAdminWrite } from "@/features/admin/access";
import { getAdminProductFormData } from "@/features/admin/products";

export default async function AdminEditProductPage({ params }: { params: { id: string } }) {
  const { access, data } = await getAdminProductFormData(params.id);
  const action = updateProductDraftAction.bind(null, params.id);

  return (
    <>
      <AdminPageHeader title="Редактирование товара" description="Основные поля каталожной позиции." />
      <AdminAccessNotice access={access} />
      {data.product ? (
        <ProductForm
          product={data.product}
          categories={data.categories}
          action={action}
          disabled={!canAdminWrite(access)}
          submitLabel="Сохранить"
        />
      ) : (
        <EmptyState title="Товар не найден" description="Проверьте ссылку или откройте список товаров." />
      )}
    </>
  );
}
