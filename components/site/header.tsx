"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Phone, X } from "lucide-react";
import { contactDetails } from "@/content/contact";
import { mainLinks } from "@/content/navigation";

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <div className="navbar_component w-nav" role="banner" data-collapse="medium" style={{ opacity: 1 }}>
      <div className="navbar_container">
        <Link href="/" className="navbar_logo-link w-nav-brand">
          <div className="navbar_logo-image-wrapper">
            <div className="heading-12">NEBESA</div>
          </div>
        </Link>
        <nav role="navigation" className="navbar_menu is-page-height-tablet w-nav-menu" data-nav-menu-open={open ? "" : undefined}>
          {mainLinks.map((link) => (
            <Link key={link.href} href={link.href} className="navbar_link w-nav-link" onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
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

