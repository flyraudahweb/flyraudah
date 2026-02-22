import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Phone, Mail, Briefcase } from "lucide-react";
import BecomeAgentDialog from "@/components/landing/BecomeAgentDialog";
import { useContactInfo } from "@/hooks/useContactInfo";

const CTABanner = () => {
  const { t } = useTranslation();
  const [agentDialogOpen, setAgentDialogOpen] = useState(false);
  const contact = useContactInfo();

  return (
    <section id="contact" className="py-20 relative overflow-hidden emerald-gradient">
      {/* Geometric overlay */}
      <div className="absolute inset-0 geometric-overlay opacity-20" />

      <div className="container mx-auto px-6 sm:px-10 lg:px-16 relative z-10 text-center">
        <div className="glass-panel border-white/10 rounded-3xl p-10 md:p-16 shadow-2xl relative overflow-hidden">
          <h2 className="font-heading text-4xl md:text-5xl font-bold text-primary-foreground mb-3">
            {t("cta.title")}
          </h2>
          <div className="ornament-divider mt-4 mb-6">
            <div className="diamond" />
          </div>
          <p className="text-primary-foreground/80 mb-12 max-w-xl mx-auto text-lg tracking-wide">
            {t("cta.subtitle")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
            <a
              href={`tel:${(contact.phone || "").replace(/\s/g, "")}`}
              className="flex items-center gap-3 text-primary-foreground hover:text-secondary transition-colors text-lg"
            >
              <div className="w-12 h-12 rounded-full bg-primary-foreground/10 flex items-center justify-center">
                <Phone className="h-5 w-5" />
              </div>
              <span className="font-semibold">{contact.phone}</span>
            </a>
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-3 text-primary-foreground hover:text-secondary transition-colors text-lg"
            >
              <div className="w-12 h-12 rounded-full bg-primary-foreground/10 flex items-center justify-center">
                <Mail className="h-5 w-5" />
              </div>
              <span className="font-semibold">{contact.email}</span>
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
              onClick={() => setAgentDialogOpen(true)}
              className="border-2 border-primary-foreground/40 text-primary-foreground bg-transparent hover:bg-primary-foreground/10 text-lg px-12 py-7 rounded-xl"
            >
              <Briefcase className="h-5 w-5 mr-2" />
              Become an Agent
            </Button>
          </div>
        </div>
      </div>

      <BecomeAgentDialog open={agentDialogOpen} onOpenChange={setAgentDialogOpen} />
    </section>
  );
};

export default CTABanner;
