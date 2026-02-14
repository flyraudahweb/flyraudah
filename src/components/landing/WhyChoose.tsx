import { useTranslation } from "react-i18next";
import { Shield, Gem, Users, CreditCard } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  { icon: Shield, titleKey: "why.licensed", descKey: "why.licensedDesc" },
  { icon: Gem, titleKey: "why.luxury", descKey: "why.luxuryDesc" },
  { icon: Users, titleKey: "why.guides", descKey: "why.guidesDesc" },
  { icon: CreditCard, titleKey: "why.payment", descKey: "why.paymentDesc" },
];

const WhyChoose = () => {
  const { t } = useTranslation();

  return (
    <section id="about" className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
            {t("why.title")}
          </h2>
          <p className="mt-3 text-muted-foreground">{t("why.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.titleKey}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-card border border-secondary/20 rounded-xl p-6 text-center hover:shadow-gold hover:-translate-y-1 transition-all duration-300"
            >
              <div className="mx-auto w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center mb-4">
                <f.icon className="h-7 w-7 text-secondary" />
              </div>
              <h3 className="font-heading text-lg font-bold text-foreground mb-2">
                {t(f.titleKey)}
              </h3>
              <p className="text-sm text-muted-foreground">{t(f.descKey)}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChoose;
