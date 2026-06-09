import { AdminAccessNotice } from "@/components/admin/access-notice";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { FormField, inputClassName } from "@/components/admin/form-field";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { upsertCategoryAction } from "@/features/admin/actions";
import { isAdminReady } from "@/features/admin/access";
import { formatDateTime } from "@/features/admin/format";
import { getAdminCategoriesPageData, type AdminCategory } from "@/features/admin/products";

const categoryColumns: DataTableColumn<AdminCategory>[] = [
  {
    header: "Название",
    cell: (category) => (
      <div>
        <div className="font-medium">{category.title}</div>
        <div className="mt-1 text-xs text-[#6b7671]">{category.slug}</div>
      </div>
    ),
  },
  {
    header: "Состояние",
    cell: (category) => <StatusBadge label={category.is_active ? "Активна" : "Отключена"} tone={category.is_active ? "success" : "neutral"} />,
  },
  {
    header: "Источник",
    cell: (category) => category.source_page ?? "Ручная",
  },
  {
    header: "Обновлена",
    cell: (category) => formatDateTime(category.updated_at),
  },
];

export default async function AdminCategoriesPage() {
  const { access, data } = await getAdminCategoriesPageData();
  const canWrite = isAdminReady(access);

  return (
    <>
      <AdminPageHeader title="Категории" description="Структура публичного каталога и импортированных разделов." />
      <AdminAccessNotice access={access} />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <DataTable
          columns={categoryColumns}
          rows={data.categories}
          getRowKey={(category) => category.id}
          emptyTitle="Категорий пока нет"
          emptyDescription="Создайте первую категорию или запустите импорт каталога."
        />
        <form action={canWrite ? upsertCategoryAction : undefined} className="grid h-fit gap-4 rounded-md border border-[#d8dedc] bg-white p-5">
          <fieldset disabled={!canWrite} className="grid gap-4">
            <FormField label="Название" htmlFor="category-title">
              <input id="category-title" name="title" required className={inputClassName} />
            </FormField>
            <FormField label="Slug" htmlFor="category-slug">
              <input id="category-slug" name="slug" className={inputClassName} />
            </FormField>
            <FormField label="Описание" htmlFor="category-description">
              <textarea id="category-description" name="description" rows={3} className={inputClassName} />
            </FormField>
            <FormField label="Сортировка" htmlFor="category-sort">
              <input id="category-sort" name="sort_order" type="number" min="0" defaultValue={0} className={inputClassName} />
            </FormField>
            <label className="flex items-center gap-3 text-sm font-medium text-[#1f2528]">
              <input name="is_active" type="checkbox" defaultChecked className="h-4 w-4 rounded border-[#cbd4d0]" />
              Активна
            </label>
          </fieldset>
          <button
            type="submit"
            disabled={!canWrite}
            className="inline-flex min-h-10 justify-center rounded-md bg-[#1f2528] px-4 py-2 text-sm font-medium text-white disabled:bg-[#9aa39f]"
          >
            Добавить категорию
          </button>
        </form>
      </div>
    </>
  );
}
