"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

declare global {
  interface Window {
    VANTA?: {
      CLOUDS?: (options: Record<string, unknown>) => { destroy?: () => void };
    };
  }
}

const remoteScriptPromises = new Map<string, Promise<void>>();
const threeScriptUrl = "https://uploads-ssl.webflow.com/5d932bf11608325eac058a21/5d932d68160832c7c0059c91_three.r92.min.txt";
const vantaCloudsScriptUrl = "https://uploads-ssl.webflow.com/5d932bf11608325eac058a21/5d93301de2a4d93ad0b1fe54_vanta.clouds.min.txt";

function loadRemoteScript(src: string) {
  const existing = remoteScriptPromises.get(src);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    const currentScript = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (currentScript?.dataset.loaded === "true") {
      resolve();
      return;
    }

    const script = currentScript ?? document.createElement("script");
    script.src = src;
    script.async = false;
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true },
    );
    script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
    if (!currentScript) document.head.appendChild(script);
  });

  remoteScriptPromises.set(src, promise);
  return promise;
}

function setOpen(element: HTMLElement, open: boolean) {
  element.classList.toggle("w--open", open);
  element.setAttribute("aria-expanded", String(open));
}

export function LegacyInteractions() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const cleanups: Array<() => void> = [];

    document.documentElement.classList.add(
      "w-mod-js",
      "w-mod-ix",
      "wf-active",
      "wf-opensans-n4-active",
      "wf-opensans-n6-active",
      "wf-opensans-n7-active",
      "wf-montserrat-n4-active",
      "wf-montserrat-n5-active",
      "wf-montserrat-n6-active",
      "wf-montserrat-n7-active",
      "wf-changaone-n4-active",
      "wf-oswald-n4-active",
    );

    const sky = document.querySelector<HTMLElement>("#sky");
    let skyCancelled = false;
    let skyEffect: { destroy?: () => void } | undefined;
    if (sky) {
      const initSky = async () => {
        try {
          await loadRemoteScript(threeScriptUrl);
          await loadRemoteScript(vantaCloudsScriptUrl);
          if (skyCancelled || !sky.isConnected || !window.VANTA?.CLOUDS) return;
          const speed = /Mobi|Android/i.test(navigator.userAgent) ? 1 : 0.33;
          skyEffect = window.VANTA.CLOUDS({
            el: "#sky",
            skyColor: 0x91b8c7,
            cloudColor: 0xb1c2dc,
            cloudShadowColor: 0x1b3a57,
            sunColor: 0xff9c21,
            sunGlareColor: 0xfa6331,
            sunlightColor: 0xfa9531,
            speed,
          });
        } catch {
          sky.style.background = "linear-gradient(180deg, #c4dbe4 0%, #f5eadb 45%, #9fb2bd 100%)";
        }
      };
      void initSky();
      cleanups.push(() => {
        skyCancelled = true;
        skyEffect?.destroy?.();
      });
    }

    const revealNode = (node: HTMLElement) => {
      if (!node.style.transition) {
        node.style.transition = "opacity 700ms ease, transform 700ms ease";
      }
      node.style.opacity = "1";
      if (node.style.transform) {
        node.style.transform = "translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg) skew(0deg, 0deg)";
      }
    };

    const revealTargets = Array.from(document.querySelectorAll<HTMLElement>('[style*="opacity:0"]')).filter(
      (node) => !node.classList.contains("phone-screen_img"),
    );
    const pendingRevealTargets = new Set(revealTargets);
    let revealFrame = 0;
    const revealVisibleTargets = () => {
      revealFrame = 0;
      pendingRevealTargets.forEach((node) => {
        const rect = node.getBoundingClientRect();
        if (rect.top >= window.innerHeight * 0.92 || rect.bottom <= 0) return;
        revealNode(node);
        pendingRevealTargets.delete(node);
      });
    };
    const scheduleReveal = () => {
      if (revealFrame) return;
      revealFrame = window.requestAnimationFrame(revealVisibleTargets);
    };
    revealVisibleTargets();
    window.addEventListener("scroll", scheduleReveal, { passive: true });
    window.addEventListener("resize", scheduleReveal);
    cleanups.push(() => {
      window.removeEventListener("scroll", scheduleReveal);
      window.removeEventListener("resize", scheduleReveal);
      if (revealFrame) window.cancelAnimationFrame(revealFrame);
    });

    const phoneScreens = Array.from(document.querySelectorAll<HTMLElement>(".phone-screen_img"));
    const stickySteps = [
      {
        text: document.querySelector<HTMLElement>(".sticky-text_wrapper.steps.first"),
        detail: document.querySelector<HTMLElement>(".stick-text_detail.step1"),
        circle: document.querySelector<HTMLElement>(".circle-number.step-1"),
      },
      {
        text: document.querySelector<HTMLElement>(".sticky-text_wrapper.steps.second"),
        detail: document.querySelector<HTMLElement>(".stick-text_detail.step2"),
        circle: document.querySelector<HTMLElement>(".circle-number.step-2"),
      },
      {
        text: document.querySelector<HTMLElement>(".sticky-text_wrapper.steps.fourth"),
        detail: document.querySelector<HTMLElement>(".stick-text_detail.step4"),
        circle: document.querySelector<HTMLElement>(".circle-number.step-4"),
      },
    ];
    const updatePhoneScreens = () => {
      if (!phoneScreens.length) return;
      const stepOne = document.querySelector<HTMLElement>("#steps1");
      const stepFour = document.querySelector<HTMLElement>("#steps4");
      const scrollTop = window.scrollY;
      const positions = [stepOne, stepFour].map((node) =>
        node ? node.getBoundingClientRect().top + window.scrollY : Number.POSITIVE_INFINITY,
      );
      let activeIndex = -1;
      if (scrollTop >= positions[1] - window.innerHeight * 0.55) activeIndex = 2;
      else if (scrollTop >= positions[0] - window.innerHeight * 0.1) activeIndex = 1;
      else if (scrollTop >= positions[0] - window.innerHeight * 0.55) activeIndex = 0;
      phoneScreens.forEach((node, index) => {
        node.style.opacity = index === activeIndex ? "1" : "0";
      });
      stickySteps.forEach((step, index) => {
        const active = index === activeIndex;
        if (step.text) step.text.style.opacity = active ? "1" : "0.3";
        if (step.detail) step.detail.style.height = active ? "auto" : "0px";
        if (step.circle) {
          step.circle.style.backgroundColor = active ? "rgb(255, 81, 81)" : "rgb(255, 255, 255)";
          step.circle.style.color = active ? "rgb(255, 255, 255)" : "rgb(54, 54, 54)";
        }
      });
    };
    updatePhoneScreens();
    window.addEventListener("scroll", updatePhoneScreens, { passive: true });
    window.addEventListener("resize", updatePhoneScreens);
    cleanups.push(() => {
      window.removeEventListener("scroll", updatePhoneScreens);
      window.removeEventListener("resize", updatePhoneScreens);
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

    const legacyNavLinks = Array.from(
      document.querySelectorAll<HTMLAnchorElement>(".navbar_link, .footer_link"),
    );
    const updateCurrentLinks = () => {
      const activePath = window.location.pathname;
      const activeHash = window.location.hash;
      legacyNavLinks.forEach((link) => {
        link.classList.remove("w--current");
        link.removeAttribute("aria-current");
      });

      const activeLink = legacyNavLinks.find((link) => {
        const href = link.getAttribute("href");
        if (!href || href.startsWith("tel:") || href.startsWith("mailto:")) return false;
        const target = new URL(href, window.location.origin);
        if (target.origin !== window.location.origin) return false;

        if (activeHash === "#services-section") {
          return target.pathname === "/" && target.hash === "#services-section";
        }

        return target.pathname === activePath && !target.hash;
      });

      activeLink?.classList.add("w--current");
      activeLink?.setAttribute("aria-current", "page");
    };
    const pendingHash = window.sessionStorage.getItem("nebesa-pending-hash");
    if (pendingHash) {
      const pendingPath = window.sessionStorage.getItem("nebesa-pending-path") || window.location.pathname;
      window.sessionStorage.removeItem("nebesa-pending-hash");
      window.sessionStorage.removeItem("nebesa-pending-path");
      window.history.replaceState(null, "", `${pendingPath}${pendingHash}`);
    }
    updateCurrentLinks();
    window.addEventListener("hashchange", updateCurrentLinks);
    cleanups.push(() => window.removeEventListener("hashchange", updateCurrentLinks));

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

    const scrollToHash = (hash: string, behavior: ScrollBehavior = "smooth") => {
      const target = document.querySelector<HTMLElement>(hash);
      if (!target) return false;
      target.scrollIntoView({ behavior, block: hash === "#services-section" ? "center" : "start" });
      return true;
    };

    const onInternalLinkClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const link = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target || link.hasAttribute("download")) return;

      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("tel:") || href.startsWith("mailto:")) return;

      const target = new URL(href, window.location.origin);
      if (target.origin !== window.location.origin) return;

      event.preventDefault();
      const destination = `${target.pathname}${target.search}${target.hash}`;

      if (target.pathname === window.location.pathname && target.search === window.location.search) {
        window.history.pushState(null, "", destination || "/");
        if (target.hash) {
          scrollToHash(target.hash);
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        updateCurrentLinks();
        return;
      }

      if (target.hash) {
        window.sessionStorage.setItem("nebesa-pending-hash", target.hash);
        window.sessionStorage.setItem("nebesa-pending-path", `${target.pathname}${target.search}`);
        router.push(`${target.pathname}${target.search}`);
        return;
      }

      router.push(destination);
    };
    document.addEventListener("click", onInternalLinkClick, true);
    cleanups.push(() => document.removeEventListener("click", onInternalLinkClick, true));

    const onAnchorClick = (event: Event) => {
      const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!link || link.hash.length <= 1) return;
      if (!document.querySelector(link.hash)) return;
      event.preventDefault();
      window.history.pushState(null, "", `${window.location.pathname}${window.location.search}${link.hash}`);
      scrollToHash(link.hash);
      updateCurrentLinks();
    };
    document.addEventListener("click", onAnchorClick);
    cleanups.push(() => document.removeEventListener("click", onAnchorClick));

    if (window.location.hash.length > 1) {
      window.setTimeout(() => {
        scrollToHash(window.location.hash, "auto");
        updateCurrentLinks();
      }, 250);
    }

    window.setTimeout(() => {
      document.documentElement.dataset.nebesaLegacyInteractions = "ready";
      window.dispatchEvent(new CustomEvent("nebesa:legacy-interactions-ready"));
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") document.querySelector<HTMLElement>(".nebesa-lightbox-backdrop")?.remove();
    };
    document.addEventListener("keydown", onKeyDown);
    cleanups.push(() => document.removeEventListener("keydown", onKeyDown));

    return () => {
      delete document.documentElement.dataset.nebesaLegacyInteractions;
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [pathname, router]);

  return null;
}
