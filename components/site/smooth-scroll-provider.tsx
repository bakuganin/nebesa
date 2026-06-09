"use client";

import { useEffect } from "react";

function shouldUseNativeScroll(node: HTMLElement) {
  return Boolean(
    node.closest(
      [
        "[data-lenis-prevent]",
        ".nebesa-lightbox-backdrop",
        ".w-dropdown-list",
        ".faq_answer",
        ".overflow-y-auto",
        ".overflow-auto",
      ].join(","),
    ),
  );
}

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let destroyed = false;
    let lenis: { destroy: () => void } | undefined;

    void import("lenis").then(({ default: Lenis }) => {
      if (destroyed) return;
      lenis = new Lenis({
        anchors: true,
        autoRaf: true,
        allowNestedScroll: true,
        wheelMultiplier: 0.9,
        touchMultiplier: 1.2,
        duration: 0.8,
        prevent: shouldUseNativeScroll,
      });
    });

    return () => {
      destroyed = true;
      lenis?.destroy();
    };
  }, []);

  return children;
}
