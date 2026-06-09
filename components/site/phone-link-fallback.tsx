"use client";

import { useEffect } from "react";

import { contactDetails } from "@/content/contact";

function isMobileUserAgent() {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function getPhoneLabel(link: HTMLAnchorElement) {
  const rawPhone = link.getAttribute("href")?.replace(/^tel:/i, "") || "";
  if (rawPhone.replace(/\s/g, "") === contactDetails.phone.replace(/\s/g, "")) {
    return contactDetails.phoneLabel;
  }

  return link.textContent?.trim() || rawPhone || contactDetails.phoneLabel;
}

function showPhoneFallback(phone: string) {
  document.querySelector(".nebesa-phone-toast")?.remove();

  const toast = document.createElement("div");
  toast.className = "nebesa-phone-toast";
  toast.setAttribute("role", "status");
  toast.textContent = `Телефон: ${phone}`;
  document.body.appendChild(toast);

  void navigator.clipboard?.writeText(phone).catch(() => undefined);
  window.setTimeout(() => toast.remove(), 4200);
}

export function PhoneLinkFallback() {
  useEffect(() => {
    const onPhoneClick = (event: Event) => {
      const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="tel:"]');
      if (!link || isMobileUserAgent()) return;

      event.preventDefault();
      showPhoneFallback(getPhoneLabel(link));
    };

    document.addEventListener("click", onPhoneClick, true);
    document.documentElement.dataset.nebesaPhoneFallback = "ready";

    return () => {
      document.removeEventListener("click", onPhoneClick, true);
      delete document.documentElement.dataset.nebesaPhoneFallback;
    };
  }, []);

  return null;
}
