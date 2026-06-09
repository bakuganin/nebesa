"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { FormField, inputClassName } from "./form-field";

type TemplateActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: {
    variables?: string;
  };
};

const initialState: TemplateActionState = {
  status: "idle",
};

function SubmitButton({ disabled, label }: { disabled?: boolean; label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="inline-flex min-h-10 w-fit items-center justify-center rounded-md bg-[#1f2528] px-4 py-2 text-sm font-medium text-white outline-none transition hover:bg-[#2f3935] focus-visible:ring-2 focus-visible:ring-[#59685e]/30 disabled:cursor-not-allowed disabled:bg-[#9aa39f]"
    >
      {pending ? "Сохранение..." : label}
    </button>
  );
}

export function TemplateForm({
  action,
  disabled,
  submitLabel,
}: {
  action: (state: TemplateActionState, formData: FormData) => Promise<TemplateActionState>;
  disabled?: boolean;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const variablesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (state.status === "error" && state.fieldErrors?.variables) {
      variablesRef.current?.focus();
    }
  }, [state.fieldErrors?.variables, state.status]);

  return (
    <form action={disabled ? undefined : formAction} className="grid gap-4 rounded-md border border-[#d8dedc] bg-white p-5">
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
            ref={variablesRef}
            id="template-variables"
            name="variables"
            rows={3}
            defaultValue="[]"
            aria-invalid={state.fieldErrors?.variables ? true : undefined}
            aria-describedby={state.fieldErrors?.variables ? "template-variables-error" : undefined}
            className={inputClassName}
          />
          {state.fieldErrors?.variables ? (
            <span id="template-variables-error" className="text-xs font-medium text-[#742c2c]">
              {state.fieldErrors.variables}
            </span>
          ) : null}
        </FormField>
        <label className="flex items-center gap-3 text-sm font-medium text-[#1f2528]">
          <input name="is_active" type="checkbox" defaultChecked className="h-4 w-4 rounded border-[#cbd4d0]" />
          Активен
        </label>
      </fieldset>
      {state.message ? (
        <div
          role={state.status === "error" ? "alert" : "status"}
          aria-live={state.status === "error" ? "assertive" : "polite"}
          className={`rounded-md px-3 py-2 text-sm ${
            state.status === "success" ? "bg-[#edf7f0] text-[#295338]" : "bg-[#fff0f0] text-[#742c2c]"
          }`}
        >
          {state.message}
        </div>
      ) : null}
      <SubmitButton disabled={disabled} label={submitLabel} />
    </form>
  );
}
