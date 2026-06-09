import { contactDetails } from "@/content/contact";

export function AnnouncementBanner() {
  return (
    <section className="rl_banner10_component" style={{ opacity: 1 }}>
      <div className="rl-padding-global-4">
        <div className="rl_banner10_content-wrapper">
          <div className="rl_banner10_content">
            <div className="rl-text-style-regular-3">
              Доставка покойных в морг круглосуточно{" "}
              <a href={`tel:${contactDetails.phone}`} className="link">
                55582200
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

