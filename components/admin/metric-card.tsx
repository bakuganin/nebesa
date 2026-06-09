import type { ReactNode } from "react";

export function MetricCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-[#d8dedc] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-[#59685e]">{label}</div>
          <div className="mt-2 text-2xl font-semibold tracking-normal text-[#1f2528]">{value}</div>
        </div>
        {icon ? <div className="rounded-md bg-[#eef2f0] p-2 text-[#59685e]">{icon}</div> : null}
      </div>
      {hint ? <div className="mt-3 text-xs text-[#6b7671]">{hint}</div> : null}
    </div>
  );
}
