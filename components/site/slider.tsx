export function Slider({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className ?? "w-slider"}>{children}</div>;
}

