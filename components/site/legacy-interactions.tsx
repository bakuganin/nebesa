"use client";

import { useEffect } from "react";

function setOpen(element: HTMLElement, open: boolean) {
  element.classList.toggle("w--open", open);
  element.setAttribute("aria-expanded", String(open));
}

export function LegacyInteractions() {
  useEffect(() => {
    const cleanups: Array<() => void> = [];

    document.documentElement.classList.add("w-mod-js");
    document.querySelectorAll<HTMLElement>('[style*="opacity:0"]').forEach((node) => {
      node.style.opacity = "1";
    });
    document.querySelectorAll<HTMLElement>(".phone-screen_img").forEach((node, index) => {
      node.style.opacity = index === 0 ? "1" : "0";
    });

    document.querySelectorAll<HTMLElement>(".w-nav").forEach((nav) => {
      const button = nav.querySelector<HTMLElement>(".w-nav-button");
      const menu = nav.querySelector<HTMLElement>(".w-nav-menu");
      if (!button || !menu) return;

      const close = () => {
        setOpen(button, false);
        menu.removeAttribute("data-nav-menu-open");
        menu.style.removeProperty("display");
      };
      const toggle = () => {
        const open = !button.classList.contains("w--open");
        setOpen(button, open);
        if (open) {
          menu.setAttribute("data-nav-menu-open", "");
          menu.style.display = "block";
        } else {
          close();
        }
      };
      button.addEventListener("click", toggle);
      cleanups.push(() => button.removeEventListener("click", toggle));

      menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", close));
      cleanups.push(() => menu.querySelectorAll("a").forEach((link) => link.removeEventListener("click", close)));
    });

    document.querySelectorAll<HTMLElement>(".w-dropdown").forEach((dropdown) => {
      const toggle = dropdown.querySelector<HTMLElement>(".w-dropdown-toggle");
      const list = dropdown.querySelector<HTMLElement>(".w-dropdown-list");
      if (!toggle || !list) return;

      const onClick = () => {
        const open = !dropdown.classList.contains("w--open");
        dropdown.classList.toggle("w--open", open);
        setOpen(toggle, open);
        list.style.height = open ? "auto" : "0px";
        list.style.display = open ? "block" : "";
      };
      toggle.addEventListener("click", onClick);
      cleanups.push(() => toggle.removeEventListener("click", onClick));
    });

    document.querySelectorAll<HTMLElement>(".faq_question").forEach((question) => {
      const answer = question.parentElement?.querySelector<HTMLElement>(".faq_answer");
      if (!answer) return;
      const onClick = () => {
        const open = answer.style.height !== "auto";
        answer.style.height = open ? "auto" : "0px";
        question.parentElement?.classList.toggle("is-open", open);
      };
      question.addEventListener("click", onClick);
      cleanups.push(() => question.removeEventListener("click", onClick));
    });

    document.querySelectorAll<HTMLElement>(".w-tabs").forEach((tabs) => {
      const links = Array.from(tabs.querySelectorAll<HTMLElement>(".w-tab-link"));
      const panes = Array.from(tabs.querySelectorAll<HTMLElement>(".w-tab-pane"));
      const activate = (tabName: string) => {
        links.forEach((link) => link.classList.toggle("w--current", link.dataset.wTab === tabName));
        panes.forEach((pane) => pane.classList.toggle("w--tab-active", pane.dataset.wTab === tabName));
        tabs.dataset.current = tabName;
      };
      links.forEach((link) => {
        const onClick = (event: Event) => {
          event.preventDefault();
          if (link.dataset.wTab) activate(link.dataset.wTab);
        };
        link.addEventListener("click", onClick);
        cleanups.push(() => link.removeEventListener("click", onClick));
      });
      const current = links.find((link) => link.classList.contains("w--current"))?.dataset.wTab ?? links[0]?.dataset.wTab;
      if (current) activate(current);
    });

    document.querySelectorAll<HTMLElement>(".w-slider").forEach((slider) => {
      const slides = Array.from(slider.querySelectorAll<HTMLElement>(".w-slide"));
      const left = slider.querySelector<HTMLElement>(".w-slider-arrow-left");
      const right = slider.querySelector<HTMLElement>(".w-slider-arrow-right");
      if (!slides.length || (!left && !right)) return;
      let index = 0;
      const render = () => {
        slides.forEach((slide, slideIndex) => {
          slide.style.display = slideIndex === index ? "inline-block" : "none";
        });
      };
      const prev = (event: Event) => {
        event.preventDefault();
        index = (index - 1 + slides.length) % slides.length;
        render();
      };
      const next = (event: Event) => {
        event.preventDefault();
        index = (index + 1) % slides.length;
        render();
      };
      left?.addEventListener("click", prev);
      right?.addEventListener("click", next);
      cleanups.push(() => left?.removeEventListener("click", prev));
      cleanups.push(() => right?.removeEventListener("click", next));
      render();
    });

    const onLightboxClick = (event: Event) => {
      const target = event.target as HTMLElement;
      const link = target.closest<HTMLElement>(".w-lightbox");
      const image = link?.querySelector<HTMLImageElement>("img");
      if (!link || !image) return;
      event.preventDefault();
      const overlay = document.createElement("button");
      overlay.type = "button";
      overlay.className = "w-lightbox-backdrop nebesa-lightbox-backdrop";
      overlay.setAttribute("aria-label", "Закрыть изображение");
      overlay.innerHTML = `<img class="w-lightbox-image" src="${image.currentSrc || image.src}" alt="${image.alt || ""}">`;
      overlay.addEventListener("click", () => overlay.remove());
      document.body.appendChild(overlay);
    };
    document.addEventListener("click", onLightboxClick);
    cleanups.push(() => document.removeEventListener("click", onLightboxClick));

    const onAnchorClick = (event: Event) => {
      const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!link || link.hash.length <= 1) return;
      const target = document.querySelector<HTMLElement>(link.hash);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: link.hash === "#services-section" ? "center" : "start" });
    };
    document.addEventListener("click", onAnchorClick);
    cleanups.push(() => document.removeEventListener("click", onAnchorClick));

    if (window.location.hash === "#services-section") {
      window.setTimeout(() => {
        document.querySelector<HTMLElement>("#services-section")?.scrollIntoView({ block: "center" });
      }, 250);
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") document.querySelector<HTMLElement>(".nebesa-lightbox-backdrop")?.remove();
    };
    document.addEventListener("keydown", onKeyDown);
    cleanups.push(() => document.removeEventListener("keydown", onKeyDown));

    return () => cleanups.forEach((cleanup) => cleanup());
  }, []);

  return null;
}

