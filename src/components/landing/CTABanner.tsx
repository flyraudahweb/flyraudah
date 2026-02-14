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
    <section id="contact" className="py-20 emerald-gradient">
      <div className="container mx-auto px-4 text-center">
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
          {t("cta.title")}
        </h2>
        <p className="text-background/80 mb-10 max-w-xl mx-auto text-lg">
          {t("cta.subtitle")}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          <a
            href="tel:+2348035378973"
            className="flex items-center gap-2 text-primary-foreground hover:text-secondary transition-colors"
          >
            <Phone className="h-5 w-5" />
            <span className="font-medium">+234 803 537 8973</span>
          </a>
          <a
            href="mailto:flyraudah@gmail.com"
            className="flex items-center gap-2 text-primary-foreground hover:text-secondary transition-colors"
          >
            <Mail className="h-5 w-5" />
            <span className="font-medium">flyraudah@gmail.com</span>
          </a>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className="gold-gradient text-secondary-foreground shadow-gold hover:shadow-gold-lg hover:-translate-y-1 transition-all text-base px-10 py-6"
          >
            {t("cta.book")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={handleWhatsApp}
            className="border-2 border-primary-foreground/40 text-primary-foreground bg-transparent hover:bg-primary-foreground/10 text-base px-10 py-6"
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
