"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Menu, Phone, X } from "lucide-react";
import { contactDetails } from "@/content/contact";
import { mainLinks } from "@/content/navigation";

export function Header() {
  const [open, setOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  function closeAll() {
    setOpen(false);
    setOpenDropdown(null);
  }

  return (
    <div className="navbar_component w-nav" role="banner" data-collapse="medium" style={{ opacity: 1 }}>
      <div className="navbar_container">
        <Link href="/" className="navbar_logo-link w-nav-brand">
          <div className="navbar_logo-image-wrapper">
            <div className="heading-12">NEBESA</div>
          </div>
        </Link>
        <nav role="navigation" className="navbar_menu is-page-height-tablet w-nav-menu" data-nav-menu-open={open ? "" : undefined}>
          {mainLinks.map((link) =>
            link.children?.length ? (
              <div
                key={link.href}
                className={`relative inline-block ${openDropdown === link.href ? "w--open" : ""}`}
                onMouseEnter={() => setOpenDropdown(link.href)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button
                  type="button"
                  className="navbar_link w-nav-link inline-flex items-center gap-1"
                  aria-expanded={openDropdown === link.href}
                  onClick={() => setOpenDropdown((current) => (current === link.href ? null : link.href))}
                >
                  {link.label}
                  <ChevronDown aria-hidden="true" size={14} />
                </button>
                <div
                  className={`z-30 min-w-56 rounded-md border border-black/10 bg-white py-2 shadow-lg md:absolute md:left-0 md:top-full ${
                    openDropdown === link.href ? "block" : "hidden"
                  }`}
                >
                  {link.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className="block px-4 py-2 text-sm text-ink hover:bg-mist"
                      onClick={closeAll}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link key={link.href} href={link.href} className="navbar_link w-nav-link" onClick={closeAll}>
                {link.label}
              </Link>
            ),
          )}
          <a href={`tel:${contactDetails.phone}`} className="button-4 is-navbar-button menu_button w-inline-block">
            <div className="button_circle menu_button-circle" />
            <div className="button_text-regular is-menu-button-text">Позвонить</div>
          </a>
        </nav>
        <div className="navbar_button-wrapper">
          <a href={`tel:${contactDetails.phone}`} className="button-4 is-navbar-button hide-tablet w-inline-block">
            <div className="button_circle" />
            <div className="button_text-small">{contactDetails.phoneLabel}</div>
          </a>
          <button
            type="button"
            className={`navbar_menu-button w-nav-button ${open ? "w--open" : ""}`}
            aria-label={open ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
    </div>
  );
}
