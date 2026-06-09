export function Tabs({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className ?? "w-tabs"}>{children}</div>;
}

