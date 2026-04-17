import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Phone, Mail, Briefcase, ArrowRight } from "lucide-react";
import BecomeAgentDialog from "@/components/landing/BecomeAgentDialog";
import { useContactInfo } from "@/hooks/useContactInfo";
import { motion } from "framer-motion";

const CTABanner = () => {
  const { t } = useTranslation();
  const [agentDialogOpen, setAgentDialogOpen] = useState(false);
  const contact = useContactInfo();

  return (
    <section id="contact" className="py-20 relative overflow-hidden">
      {/* Full-width gradient background */}
      <div className="absolute inset-0 hero-gradient" />

      {/* Decorative floating blobs */}
      <div className="absolute top-10 left-20 w-64 h-64 bg-white/5 rounded-full blur-3xl float-blob" />
      <div className="absolute bottom-10 right-20 w-80 h-80 bg-white/5 rounded-full blur-3xl float-blob-alt" />

      {/* Geometric overlay */}
      <div className="absolute inset-0 geometric-overlay opacity-15" />

      <div className="container mx-auto px-6 sm:px-10 lg:px-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto"
        >
          <h2 className="font-heading text-4xl md:text-5xl font-black text-white mb-4">
            {t("cta.title")}
          </h2>
          <div className="mt-4 mb-6 flex items-center justify-center gap-3">
            <div className="h-0.5 w-12 bg-gradient-to-r from-transparent to-white/50 rounded-full" />
            <div className="w-2 h-2 bg-white/60 rounded-full" />
            <div className="h-0.5 w-12 bg-gradient-to-l from-transparent to-white/50 rounded-full" />
          </div>
          <p className="text-white/80 mb-12 max-w-xl mx-auto text-lg tracking-wide">
            {t("cta.subtitle")}
          </p>

          {/* Contact info pills */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <a
              href={`tel:${(contact.phone || "").replace(/\s/g, "")}`}
              className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-6 py-3 text-white hover:bg-white/20 transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center group-hover:bg-white/25 transition-colors">
                <Phone className="h-4 w-4" />
              </div>
              <span className="font-semibold">{contact.phone}</span>
            </a>
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-6 py-3 text-white hover:bg-white/20 transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center group-hover:bg-white/25 transition-colors">
                <Mail className="h-4 w-4" />
              </div>
              <span className="font-semibold">{contact.email}</span>
            </a>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-[#2BB673] hover:bg-white/90 shadow-soft-xl hover:shadow-2xl hover:-translate-y-1 transition-all text-lg px-10 py-7 font-bold rounded-full group"
            >
              {t("cta.book")}
              <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setAgentDialogOpen(true)}
              className="border-2 border-white/30 text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 text-lg px-10 py-7 rounded-full font-semibold"
            >
              <Briefcase className="h-5 w-5 mr-2" />
              Become an Agent
            </Button>
          </div>
        </motion.div>
      </div>

      <BecomeAgentDialog open={agentDialogOpen} onOpenChange={setAgentDialogOpen} />
    </section>
  );
};

export default CTABanner;
