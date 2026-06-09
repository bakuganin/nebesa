import Image from "next/image";

import { contactDetails } from "@/content/contact";

export function ContactSection() {
  return (
    <section className="contact-section">
      <div className="page-padding">
        <div className="container-large">
          <div id="contact" className="padding-vertical-xhuge">
            <div className="w-layout-grid contact_component">
              <div className="contact_content-left">
                <div className="heading-subheading">Контакт</div>
                <h2 className="heading-medium">Связаться</h2>
                <div className="text-size-large-2">Наша команда будет рада помочь вам.</div>
              </div>
              <div className="contact_content-right">
                <a href={`tel:${contactDetails.phone}`} className="text-style-link-02">
                  {contactDetails.phoneLabel}
                </a>
                <a href={`mailto:${contactDetails.email}`} className="text-style-link-02">
                  {contactDetails.email}
                </a>
                <Image
                  src={contactDetails.mapImage}
                  alt="Карта"
                  width={1000}
                  height={720}
                  className="contact_map-placeholder"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
