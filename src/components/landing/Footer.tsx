import { useTranslation } from "react-i18next";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";

const Footer = () => {
  const { t } = useTranslation();

  const handleWhatsApp = () => {
    const msg = encodeURIComponent("Hello Raudah Travels, I need assistance.");
    window.open(`https://wa.me/2348035378973?text=${msg}`, "_blank");
  };

  return (
    <footer className="bg-primary text-primary-foreground pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Quick Links */}
          <div>
            <h4 className="font-heading text-lg font-bold text-secondary mb-4">
              {t("footer.quickLinks")}
            </h4>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li><a href="#about" className="hover:text-secondary transition-colors">{t("footer.about")}</a></li>
              <li><a href="#" className="hover:text-secondary transition-colors">{t("footer.services")}</a></li>
              <li><a href="#" className="hover:text-secondary transition-colors">{t("footer.faq")}</a></li>
              <li><a href="#" className="hover:text-secondary transition-colors">{t("footer.terms")}</a></li>
              <li><a href="#" className="hover:text-secondary transition-colors">{t("footer.privacy")}</a></li>
            </ul>
          </div>

          {/* Packages */}
          <div>
            <h4 className="font-heading text-lg font-bold text-secondary mb-4">
              {t("footer.packages")}
            </h4>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li><a href="#packages" className="hover:text-secondary transition-colors">Hajj 2026</a></li>
              <li><a href="#packages" className="hover:text-secondary transition-colors">Ramadan Umrah</a></li>
              <li><a href="#packages" className="hover:text-secondary transition-colors">Sha'ban Umrah</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-heading text-lg font-bold text-secondary mb-4">
              {t("footer.contact")}
            </h4>
            <ul className="space-y-3 text-sm text-primary-foreground/80">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-secondary" />
                <span>Abuja, Nigeria</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-secondary" />
                <a href="tel:+2348035378973" className="hover:text-secondary transition-colors">+234 803 537 8973</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-secondary" />
                <a href="mailto:flyraudah@gmail.com" className="hover:text-secondary transition-colors">flyraudah@gmail.com</a>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-heading text-lg font-bold text-secondary mb-4">
              {t("footer.social")}
            </h4>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li>
                <button onClick={handleWhatsApp} className="flex items-center gap-2 hover:text-secondary transition-colors">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-primary-foreground/10 pt-6 text-center text-xs text-primary-foreground/60">
          <p>© 2026 Raudah Travels & Tours Ltd. {t("footer.rights")}</p>
          <p className="mt-1">{t("footer.nahcon")}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
