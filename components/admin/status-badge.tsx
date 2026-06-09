export function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const toneClassName = {
    neutral: "border-[#cbd4d0] bg-[#f7f9f8] text-[#2f3935]",
    success: "border-[#bed5c8] bg-[#edf7f0] text-[#295338]",
    warning: "border-[#e3cfaa] bg-[#fff7e8] text-[#6c4f19]",
    danger: "border-[#e2b7b7] bg-[#fff0f0] text-[#742c2c]",
  }[tone];

  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${toneClassName}`}>
      {label}
    </span>
  );
}
