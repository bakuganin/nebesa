import type { ReactNode } from "react";

import { PhoneLinkFallback } from "@/components/site/phone-link-fallback";
import { SmoothScrollProvider } from "@/components/site/smooth-scroll-provider";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <SmoothScrollProvider>
      <PhoneLinkFallback />
      {children}
    </SmoothScrollProvider>
  );
}
