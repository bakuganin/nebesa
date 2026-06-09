import type { ReactNode } from "react";

export function FormField({
  label,
  htmlFor,
  help,
  children,
}: {
  label: string;
  htmlFor?: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm text-[#1f2528]" htmlFor={htmlFor}>
      <span className="font-medium">{label}</span>
      {children}
      {help ? <span className="text-xs text-[#6b7671]">{help}</span> : null}
    </label>
  );
}

export const inputClassName =
  "min-h-10 w-full rounded-md border border-[#cbd4d0] bg-white px-3 py-2 text-sm text-[#1f2528] outline-none transition placeholder:text-[#8a948f] focus:border-[#59685e] focus:ring-2 focus:ring-[#59685e]/20 disabled:bg-[#eef2f0] disabled:text-[#7d8782]";
