import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MessageCircle } from "lucide-react";

const CTABanner = () => {
  const { t } = useTranslation();

  const handleWhatsApp = () => {
    const msg = encodeURIComponent("Hello Raudah Travels, I'm interested in your Hajj/Umrah packages.");
    window.open(`https://wa.me/2348035378973?text=${msg}`, "_blank");
  };

  return (
    <section id="contact" className="relative py-24 emerald-gradient overflow-hidden">
      {/* Geometric overlay */}
      <div className="absolute inset-0 geometric-overlay opacity-20" />

      <div className="relative z-10 container mx-auto px-4 text-center">
        <h2 className="font-heading text-4xl md:text-5xl font-bold text-primary-foreground mb-3">
          {t("cta.title")}
        </h2>
        <div className="ornament-divider mt-4 mb-6">
          <div className="diamond" />
        </div>
        <p className="text-background/80 mb-12 max-w-xl mx-auto text-lg tracking-wide">
          {t("cta.subtitle")}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
          <a
            href="tel:+2348035378973"
            className="flex items-center gap-3 text-primary-foreground hover:text-secondary transition-colors text-lg"
          >
            <div className="w-12 h-12 rounded-full bg-primary-foreground/10 flex items-center justify-center">
              <Phone className="h-5 w-5" />
            </div>
            <span className="font-semibold">+234 803 537 8973</span>
          </a>
          <a
            href="mailto:flyraudah@gmail.com"
            className="flex items-center gap-3 text-primary-foreground hover:text-secondary transition-colors text-lg"
          >
            <div className="w-12 h-12 rounded-full bg-primary-foreground/10 flex items-center justify-center">
              <Mail className="h-5 w-5" />
            </div>
            <span className="font-semibold">flyraudah@gmail.com</span>
          </a>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className="gold-gradient text-secondary-foreground shadow-gold hover:shadow-gold-lg hover:-translate-y-1 transition-all text-lg px-12 py-7 font-semibold"
          >
            {t("cta.book")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={handleWhatsApp}
            className="border-2 border-primary-foreground/40 text-primary-foreground bg-transparent hover:bg-primary-foreground/10 text-lg px-12 py-7"
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            {t("cta.whatsapp")}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CTABanner;
