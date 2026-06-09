"use client";

import { useEffect, useRef } from "react";

export function CloudHero({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const element = ref.current;
    if (!element) return;

    const tick = () => {
      const speed = /Mobi|Android/i.test(navigator.userAgent) ? 1 : 0.33;
      element.style.backgroundPosition = `${(performance.now() / 120) * speed}px 0`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <section id="sky" ref={ref} className="hero-stack">
      {children}
    </section>
  );
}

