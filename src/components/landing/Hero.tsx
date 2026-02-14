import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { motion } from "framer-motion";
import heroBg from "@/assets/hero-bg.jpg";

const Hero = () => {
  const { t } = useTranslation();

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/60 to-primary/30" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 pt-20 pb-32 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-secondary leading-tight max-w-4xl mx-auto"
        >
          {t("hero.title")}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-6 text-lg md:text-xl text-background/90 max-w-2xl mx-auto"
        >
          {t("hero.subtitle")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button
            size="lg"
            className="gold-gradient text-secondary-foreground shadow-gold hover:shadow-gold-lg hover:-translate-y-1 transition-all text-base px-8 py-6"
          >
            {t("hero.explore")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-2 border-secondary/60 text-secondary bg-transparent hover:bg-secondary/10 text-base px-8 py-6"
          >
            {t("hero.contact")}
          </Button>
        </motion.div>

        {/* Search Widget */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-16 max-w-3xl mx-auto bg-background/95 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-border"
        >
          <p className="text-sm font-medium text-muted-foreground mb-4 flex items-center justify-center gap-2">
            <Search className="h-4 w-4" />
            {t("hero.search")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select className="h-11 rounded-lg border border-input bg-background px-3 text-sm text-foreground">
              <option value="">{t("hero.type")}</option>
              <option value="hajj">{t("packages.hajj")}</option>
              <option value="umrah">{t("packages.umrah")}</option>
            </select>
            <select className="h-11 rounded-lg border border-input bg-background px-3 text-sm text-foreground">
              <option value="">{t("hero.month")}</option>
              <option value="feb">February</option>
              <option value="mar">March</option>
              <option value="jun">June</option>
              <option value="jul">July</option>
            </select>
            <Button className="h-11 gold-gradient text-secondary-foreground shadow-gold">
              {t("hero.searchBtn")}
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
