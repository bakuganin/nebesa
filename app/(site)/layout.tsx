import type { ReactNode } from "react";

import { PhoneLinkFallback } from "@/components/site/phone-link-fallback";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PhoneLinkFallback />
      {children}
    </>
  );
}
