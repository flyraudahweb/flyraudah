import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, MessageCircle, Facebook, Instagram, Twitter, ArrowUp } from "lucide-react";
import { useContactInfo } from "@/hooks/useContactInfo";

const Footer = () => {
  const { t } = useTranslation();
  const contact = useContactInfo();

  const handleWhatsApp = () => {
    const msg = encodeURIComponent("Hello Raudah Travels, I need assistance.");
    window.open(`https://wa.me/${contact.whatsapp}?text=${msg}`, "_blank");
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="relative bg-gray-900 text-gray-300 pt-20 pb-8 overflow-hidden">
      {/* Subtle top gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-1 primary-gradient" />

      {/* Decorative blobs */}
      <div className="absolute top-20 right-10 w-64 h-64 bg-[#2BB673]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-10 left-10 w-48 h-48 bg-[#4CD964]/5 rounded-full blur-3xl" />

      <div className="relative z-10 container mx-auto px-6 sm:px-10 lg:px-16">
        {/* Logo wordmark */}
        <div className="text-center mb-12">
          <img
            src="/logo.png"
            alt="Raudah Travels & Tours - Nigeria's premier Hajj and Umrah travel agency"
            className="h-14 md:h-16 w-auto object-contain mx-auto brightness-0 invert"
            loading="lazy"
            width="200"
            height="64"
          />
          <p className="text-gray-400 text-sm mt-3 tracking-widest uppercase font-semibold">
            Your Gateway to the Holy Lands
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-14">
          {/* Quick Links */}
          <div>
            <h4 className="font-heading text-lg font-bold text-white mb-5">
              {t("footer.quickLinks")}
            </h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/about" className="text-gray-400 hover:text-[#4CD964] transition-colors">{t("footer.about")}</Link></li>
              <li><Link to="/services" className="text-gray-400 hover:text-[#4CD964] transition-colors">{t("footer.services")}</Link></li>
              <li><Link to="/faq" className="text-gray-400 hover:text-[#4CD964] transition-colors">{t("footer.faq")}</Link></li>
              <li><Link to="/terms" className="text-gray-400 hover:text-[#4CD964] transition-colors">{t("footer.terms")}</Link></li>
              <li><Link to="/privacy" className="text-gray-400 hover:text-[#4CD964] transition-colors">{t("footer.privacy")}</Link></li>
            </ul>
          </div>

          {/* Packages */}
          <div>
            <h4 className="font-heading text-lg font-bold text-white mb-5">
              {t("footer.packages")}
            </h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/#packages" className="text-gray-400 hover:text-[#4CD964] transition-colors">Hajj 2026</Link></li>
              <li><Link to="/#packages" className="text-gray-400 hover:text-[#4CD964] transition-colors">Ramadan Umrah</Link></li>
              <li><Link to="/#packages" className="text-gray-400 hover:text-[#4CD964] transition-colors">Sha'ban Umrah</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-heading text-lg font-bold text-white mb-5">
              {t("footer.contact")}
            </h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-[#2BB673]" />
                <span className="text-gray-400">{contact.address}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[#2BB673]" />
                <a href={`tel:${(contact.phone || "").replace(/\s/g, "")}`} className="text-gray-400 hover:text-[#4CD964] transition-colors">{contact.phone}</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#2BB673]" />
                <a href={`mailto:${contact.email}`} className="text-gray-400 hover:text-[#4CD964] transition-colors">{contact.email}</a>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-heading text-lg font-bold text-white mb-5">
              {t("footer.social")}
            </h4>
            <div className="flex gap-3">
              <button
                onClick={handleWhatsApp}
                className="w-10 h-10 rounded-full bg-gray-800 hover:bg-[#2BB673] hover:text-white flex items-center justify-center transition-all duration-300"
                aria-label="WhatsApp"
              >
                <MessageCircle className="h-5 w-5" />
              </button>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 hover:bg-[#2BB673] hover:text-white flex items-center justify-center transition-all duration-300" aria-label="Facebook">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 hover:bg-[#2BB673] hover:text-white flex items-center justify-center transition-all duration-300" aria-label="Instagram">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 hover:bg-[#2BB673] hover:text-white flex items-center justify-center transition-all duration-300" aria-label="Twitter">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Back to top */}
        <div className="flex justify-center mb-8">
          <button
            onClick={scrollToTop}
            className="flex items-center gap-2 text-gray-500 hover:text-[#4CD964] text-sm transition-colors group"
          >
            <div className="w-10 h-10 rounded-full border border-gray-700 flex items-center justify-center group-hover:border-[#2BB673] group-hover:bg-[#2BB673]/10 transition-all">
              <ArrowUp className="h-4 w-4" />
            </div>
            Back to Top
          </button>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-800 pt-6 text-center text-xs text-gray-500">
          <p>© 2026 Raudah Travels & Tours Ltd. {t("footer.rights")}</p>
          <p className="mt-1">{t("footer.nahcon")}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
