import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-dashed border-[#cbd4d0] bg-white px-5 py-8 text-center">
      <div className="text-sm font-semibold text-[#1f2528]">{title}</div>
      {description ? <p className="mx-auto mt-2 max-w-xl text-sm text-[#59685e]">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
