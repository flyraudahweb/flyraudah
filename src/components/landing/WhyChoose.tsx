import { useTranslation } from "react-i18next";
import { Shield, Gem, Users } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  { icon: Shield, titleKey: "why.licensed", descKey: "why.licensedDesc", stat: "15+", statLabel: "Years" },
  { icon: Gem, titleKey: "why.luxury", descKey: "why.luxuryDesc", stat: "5000+", statLabel: "Pilgrims" },
  { icon: Users, titleKey: "why.guides", descKey: "why.guidesDesc", stat: "24/7", statLabel: "Support" },
];

const WhyChoose = () => {
  const { t } = useTranslation();

  return (
    <section id="about" className="py-24 bg-muted/50">
      <div className="container mx-auto px-6 sm:px-10 lg:px-16">
        <div className="text-center mb-16">
          <h2 className="font-heading text-4xl md:text-5xl font-bold text-foreground">
            {t("why.title")}
          </h2>
          <div className="ornament-divider mt-4 mb-4">
            <div className="diamond" />
          </div>
          <p className="text-muted-foreground tracking-wide">{t("why.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <motion.div
              key={f.titleKey}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass-panel border-white/10 rounded-xl p-8 text-center hover:shadow-gold hover:-translate-y-2 transition-all duration-300 group relative overflow-hidden"
            >
              {/* Stat counter */}
              <p className="font-heading text-3xl font-bold text-secondary mb-1">{f.stat}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">{f.statLabel}</p>

              {/* Icon */}
              <div className="mx-auto w-16 h-16 rounded-2xl gold-gradient flex items-center justify-center mb-5 shadow-gold group-hover:shadow-gold-lg transition-shadow">
                <f.icon className="h-8 w-8 text-secondary-foreground" />
              </div>

              <h3 className="font-heading text-lg font-bold text-foreground mb-2">
                {t(f.titleKey)}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t(f.descKey)}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChoose;
