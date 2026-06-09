import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("SmoothScrollProvider wiring", () => {
  it("wraps the root layout children so Lenis handles wheel scrolling", () => {
    const layoutSource = readFileSync(join(process.cwd(), "app/layout.tsx"), "utf8");

    expect(layoutSource).toContain('import { SmoothScrollProvider } from "@/components/site/smooth-scroll-provider";');
    expect(layoutSource).toContain("<SmoothScrollProvider>{children}</SmoothScrollProvider>");
  });
});
