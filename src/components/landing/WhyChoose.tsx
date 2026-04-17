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
    <section id="about" className="py-24 bg-gray-50/80 relative overflow-hidden">
      {/* Decorative background blur */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#2BB673]/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 sm:px-10 lg:px-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-sm font-bold tracking-widest uppercase text-[#2BB673] mb-3">
            Why Us
          </span>
          <h2 className="font-heading text-4xl md:text-5xl font-black text-gray-900">
            {t("why.title")}
          </h2>
          <div className="mt-4 mb-4 flex items-center justify-center gap-3">
            <div className="h-0.5 w-12 bg-gradient-to-r from-transparent to-[#2BB673] rounded-full" />
            <div className="w-2 h-2 bg-[#2BB673] rounded-full" />
            <div className="h-0.5 w-12 bg-gradient-to-l from-transparent to-[#2BB673] rounded-full" />
          </div>
          <p className="text-gray-500 tracking-wide text-lg">{t("why.subtitle")}</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <motion.div
              key={f.titleKey}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="bg-white rounded-2xl p-8 text-center shadow-soft hover:shadow-soft-xl hover:-translate-y-2 transition-all duration-300 group relative overflow-hidden border border-gray-100/80"
            >
              {/* Subtle gradient glow on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#2BB673]/5 to-[#4CD964]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />

              <div className="relative z-10">
                {/* Stat counter */}
                <p className="font-heading text-4xl font-black gradient-text mb-1">{f.stat}</p>
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-5 font-semibold">{f.statLabel}</p>

                {/* Icon */}
                <div className="mx-auto w-16 h-16 rounded-2xl primary-gradient flex items-center justify-center mb-5 shadow-gold group-hover:shadow-gold-lg group-hover:scale-110 transition-all duration-300">
                  <f.icon className="h-8 w-8 text-white" />
                </div>

                <h3 className="font-heading text-lg font-bold text-gray-900 mb-2">
                  {t(f.titleKey)}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">{t(f.descKey)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChoose;
