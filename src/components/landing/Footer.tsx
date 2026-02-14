import { useTranslation } from "react-i18next";
import { Phone, Mail, MapPin, MessageCircle, Facebook, Instagram, Twitter, ArrowUp } from "lucide-react";

const Footer = () => {
  const { t } = useTranslation();

  const handleWhatsApp = () => {
    const msg = encodeURIComponent("Hello Raudah Travels, I need assistance.");
    window.open(`https://wa.me/2348035378973?text=${msg}`, "_blank");
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="relative bg-primary text-primary-foreground pt-20 pb-8 overflow-hidden">
      {/* Subtle geometric pattern */}
      <div className="absolute inset-0 geometric-overlay opacity-10" />

      <div className="relative z-10 container mx-auto px-6 sm:px-10 lg:px-16">
        {/* Logo wordmark */}
        <div className="text-center mb-12">
          <img
            src="https://i.ibb.co/C3zkfpVR/Rauda-Logo-2-PNG.png"
            alt="Raudah Travels & Tours - Nigeria's premier Hajj and Umrah travel agency"
            className="h-14 md:h-16 w-auto object-contain mx-auto brightness-0 invert"
            loading="lazy"
            width="200"
            height="64"
          />
          <p className="text-white text-sm mt-2 tracking-widest uppercase">
            Your Gateway to the Holy Lands
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-14">
          {/* Quick Links */}
          <div>
            <h4 className="font-heading text-lg font-bold text-secondary mb-5">
              {t("footer.quickLinks")}
            </h4>
            <ul className="space-y-3 text-sm text-primary-foreground/80">
              <li><a href="#about" className="hover:text-secondary transition-colors">{t("footer.about")}</a></li>
              <li><a href="#" className="hover:text-secondary transition-colors">{t("footer.services")}</a></li>
              <li><a href="#" className="hover:text-secondary transition-colors">{t("footer.faq")}</a></li>
              <li><a href="#" className="hover:text-secondary transition-colors">{t("footer.terms")}</a></li>
              <li><a href="#" className="hover:text-secondary transition-colors">{t("footer.privacy")}</a></li>
            </ul>
          </div>

          {/* Packages */}
          <div>
            <h4 className="font-heading text-lg font-bold text-secondary mb-5">
              {t("footer.packages")}
            </h4>
            <ul className="space-y-3 text-sm text-primary-foreground/80">
              <li><a href="#packages" className="hover:text-secondary transition-colors">Hajj 2026</a></li>
              <li><a href="#packages" className="hover:text-secondary transition-colors">Ramadan Umrah</a></li>
              <li><a href="#packages" className="hover:text-secondary transition-colors">Sha'ban Umrah</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-heading text-lg font-bold text-secondary mb-5">
              {t("footer.contact")}
            </h4>
            <ul className="space-y-3 text-sm text-primary-foreground/80">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-secondary" />
                <span>Kano, Nigeria</span>
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
            <h4 className="font-heading text-lg font-bold text-secondary mb-5">
              {t("footer.social")}
            </h4>
            <div className="flex gap-3">
              <button
                onClick={handleWhatsApp}
                className="w-10 h-10 rounded-full bg-primary-foreground/10 hover:bg-secondary/20 flex items-center justify-center transition-colors"
                aria-label="WhatsApp"
              >
                <MessageCircle className="h-5 w-5" />
              </button>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-primary-foreground/10 hover:bg-secondary/20 flex items-center justify-center transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-primary-foreground/10 hover:bg-secondary/20 flex items-center justify-center transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-primary-foreground/10 hover:bg-secondary/20 flex items-center justify-center transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Back to top */}
        <div className="flex justify-center mb-8">
          <button
            onClick={scrollToTop}
            className="flex items-center gap-2 text-primary-foreground/60 hover:text-secondary text-sm transition-colors"
          >
            <ArrowUp className="h-4 w-4" />
            Back to Top
          </button>
        </div>

        {/* Bottom */}
        <div className="border-t border-primary-foreground/10 pt-6 text-center text-xs text-primary-foreground/50">
          <p>© 2026 Raudah Travels & Tours Ltd. {t("footer.rights")}</p>
          <p className="mt-1">{t("footer.nahcon")}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
