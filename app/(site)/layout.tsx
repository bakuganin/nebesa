import type { ReactNode } from "react";

import { SmoothScrollProvider } from "@/components/site/smooth-scroll-provider";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return <SmoothScrollProvider>{children}</SmoothScrollProvider>;
}
