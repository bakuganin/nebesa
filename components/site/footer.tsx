import Link from "next/link";
import { contactDetails } from "@/content/contact";
import { siteCredits } from "@/content/credits";

export function Footer() {
  return (
    <footer className="footer_component">
      <div className="page-padding">
        <div className="container-large">
          <div className="footer_bottom-wrapper">
            <div className="text-size-small text-color-gray500">
              © 2024 {contactDetails.company} · {siteCredits.developer.label}{" "}
              <a
                href={siteCredits.developer.url}
                target="_blank"
                rel="noopener noreferrer"
                className="footer_credit-link"
                title={`Разработка и дизайн: ${siteCredits.developer.name}`}
              >
                {siteCredits.developer.name}
              </a>
            </div>
            <div className="w-layout-grid footer_legal-list">
              <Link href="/terms" className="footer_legal-link">
                Условия
              </Link>
              <Link href="/privacy" className="footer_legal-link">
                Конфиденциальность
              </Link>
              <Link href="/cookies" className="footer_legal-link">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
