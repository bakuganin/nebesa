import { AdminAccessNotice } from "@/components/admin/access-notice";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { createProductDraftAction } from "@/features/admin/actions";
import { isAdminReady } from "@/features/admin/access";
import { getAdminProductFormData } from "@/features/admin/products";

export default async function AdminNewProductPage() {
  const { access, data } = await getAdminProductFormData();

  return (
    <>
      <AdminPageHeader title="Новый товар" description="Создание начинается с безопасного черновика." />
      <AdminAccessNotice access={access} />
      <ProductForm
        categories={data.categories}
        action={createProductDraftAction}
        disabled={!isAdminReady(access)}
        submitLabel="Создать черновик"
      />
    </>
  );
}
