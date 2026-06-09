"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { contactDetails } from "@/content/contact";
import { mainLinks } from "@/content/navigation";

type NavLink = (typeof mainLinks)[number];

export function Header() {
  const [open, setOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const pathname = usePathname();
  const navRef = useRef<HTMLElement | null>(null);

  function closeAll() {
    setOpen(false);
    setOpenDropdown(null);
  }

  function isActive(link: NavLink) {
    if (link.children?.some((child) => child.href.split("?")[0] === pathname)) {
      return true;
    }

    return link.href === pathname;
  }

  function toggleDropdown(link: NavLink) {
    const isDesktop = typeof window !== "undefined" && window.innerWidth >= 992;

    setOpenDropdown((current) => {
      if (isDesktop) {
        return link.href;
      }

      return current === link.href ? null : link.href;
    });
  }

  function handleDesktopDropdownHover(link: NavLink | null) {
    if (typeof window === "undefined" || window.innerWidth < 992) {
      return;
    }

    setOpenDropdown(link?.href ?? null);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenDropdown(null);
      }
    }

    function onPointerDown(event: PointerEvent) {
      if (!navRef.current?.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return (
    <div className="navbar_component w-nav" role="banner" data-collapse="medium" style={{ opacity: 1 }}>
      <div className="navbar_container">
        <Link href="/" className="navbar_logo-link w-nav-brand">
          <div className="navbar_logo-image-wrapper">
            <div className="heading-12">NEBESA</div>
          </div>
        </Link>
        <nav
          ref={navRef}
          role="navigation"
          className={`navbar_menu is-page-height-tablet w-nav-menu ${open ? "is-open" : ""}`}
          data-nav-menu-open={open ? "" : undefined}
        >
          {mainLinks.map((link) =>
            link.children?.length ? (
              <div
                key={link.href}
                className={`navbar_dropdown ${openDropdown === link.href ? "w--open" : ""}`}
                onMouseEnter={() => handleDesktopDropdownHover(link)}
                onMouseLeave={() => handleDesktopDropdownHover(null)}
              >
                <button
                  type="button"
                  className={`navbar_dropdown-toggle navbar_link w-nav-link ${isActive(link) ? "w--current" : ""}`}
                  aria-expanded={openDropdown === link.href}
                  aria-current={isActive(link) ? "page" : undefined}
                  onClick={() => toggleDropdown(link)}
                >
                  <span>{link.label}</span>
                  <ChevronDown aria-hidden="true" className="navbar_dropdown-chevron" size={14} />
                </button>
                <div className="navbar_dropdown-list">
                  {link.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className="navbar_dropdown-link"
                      onClick={closeAll}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className={`navbar_link w-nav-link ${isActive(link) ? "w--current" : ""}`}
                aria-current={isActive(link) ? "page" : undefined}
                onClick={closeAll}
              >
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
