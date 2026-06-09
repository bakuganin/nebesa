import Link from "next/link";
import { contactDetails } from "@/content/contact";

export function Footer() {
  return (
    <footer className="footer_component">
      <div className="page-padding">
        <div className="container-large">
          <div className="footer_bottom-wrapper">
            <div className="text-size-small text-color-gray500">© 2024 {contactDetails.company}</div>
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
