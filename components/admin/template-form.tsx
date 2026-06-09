import { FormField, inputClassName } from "./form-field";

export function TemplateForm({
  action,
  disabled,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  disabled?: boolean;
  submitLabel: string;
}) {
  return (
    <form action={disabled ? undefined : action} className="grid gap-4 rounded-md border border-[#d8dedc] bg-white p-5">
      <fieldset disabled={disabled} className="grid gap-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <FormField label="Slug" htmlFor="template-slug">
            <input id="template-slug" name="slug" required className={inputClassName} />
          </FormField>
          <FormField label="Название" htmlFor="template-title">
            <input id="template-title" name="title" required className={inputClassName} />
          </FormField>
        </div>
        <FormField label="Текст шаблона" htmlFor="template-body" help="Переменные можно писать в формате {{customer_name}}.">
          <textarea id="template-body" name="body" required rows={5} className={inputClassName} />
        </FormField>
        <FormField label="Переменные JSON" htmlFor="template-variables">
          <textarea
            id="template-variables"
            name="variables"
            rows={3}
            defaultValue="[]"
            className={inputClassName}
          />
        </FormField>
        <label className="flex items-center gap-3 text-sm font-medium text-[#1f2528]">
          <input name="is_active" type="checkbox" defaultChecked className="h-4 w-4 rounded border-[#cbd4d0]" />
          Активен
        </label>
      </fieldset>
      <button
        type="submit"
        disabled={disabled}
        className="inline-flex min-h-10 w-fit items-center justify-center rounded-md bg-[#1f2528] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2f3935] disabled:cursor-not-allowed disabled:bg-[#9aa39f]"
      >
        {submitLabel}
      </button>
    </form>
  );
}
