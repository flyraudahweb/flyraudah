import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import heroBg from "@/assets/hero-bg.jpg";

const Hero = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");

  const titleWords = (t("hero.title") as string).split(" ");

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Parallax Background */}
      <motion.div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-110"
        style={{ backgroundImage: `url(${heroBg})` }}
        initial={{ scale: 1.15 }}
        animate={{ scale: 1.05 }}
        transition={{ duration: 20, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
      />

      {/* Geometric Islamic pattern overlay */}
      <div className="absolute inset-0 geometric-overlay opacity-40" />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/70 to-primary/30" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 sm:px-10 lg:px-16 pt-40 pb-36 text-center">
        {/* Staggered title */}
        <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight max-w-5xl mx-auto">
          {titleWords.map((word, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 * i, ease: "easeOut" }}
              className="inline-block mr-[0.3em] text-secondary"
              style={{ textShadow: "0 4px 30px hsla(43, 56%, 52%, 0.3)" }}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        {/* Gold ornamental divider */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="ornament-divider mt-6 mb-6"
        >
          <div className="diamond" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="text-lg md:text-xl lg:text-2xl text-background/90 max-w-2xl mx-auto tracking-wide"
        >
          {t("hero.subtitle")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button
            size="lg"
            className="gold-gradient text-secondary-foreground shadow-gold hover:shadow-gold-lg hover:-translate-y-1 transition-all text-base px-10 py-7 text-lg font-semibold"
            onClick={() => document.getElementById("packages")?.scrollIntoView({ behavior: "smooth" })}
          >
            {t("hero.explore")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-2 border-secondary/60 text-secondary bg-transparent hover:bg-secondary/10 text-base px-10 py-7 text-lg"
            onClick={() => window.open("https://wa.me/2348035378973?text=Hello%20Raudah%20Travels%2C%20I%20need%20assistance.", "_blank")}
          >
            {t("hero.contact")}
          </Button>
        </motion.div>

        {/* Search Widget */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.1 }}
          className="mt-20 max-w-3xl mx-auto bg-background/95 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-secondary/20"
          style={{ borderTop: "3px solid hsl(var(--gold))" }}
        >
          <p className="text-sm font-medium text-muted-foreground mb-5 flex items-center justify-center gap-2 tracking-widest uppercase">
            <Search className="h-4 w-4 text-secondary" />
            {t("hero.search")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="h-12 rounded-xl border border-input bg-background px-4 text-sm text-foreground focus:ring-2 focus:ring-secondary/30 transition-all"
            >
              <option value="">{t("hero.type")}</option>
              <option value="hajj">{t("packages.hajj")}</option>
              <option value="umrah">{t("packages.umrah")}</option>
            </select>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-12 rounded-xl border border-input bg-background px-4 text-sm text-foreground focus:ring-2 focus:ring-secondary/30 transition-all"
            >
              <option value="">{t("hero.month")}</option>
              <option value="feb">February</option>
              <option value="mar">March</option>
              <option value="jun">June</option>
              <option value="jul">July</option>
            </select>
            <Button
              className="h-12 gold-gradient text-secondary-foreground shadow-gold hover:shadow-gold-lg transition-all font-semibold text-sm"
              onClick={() => {
                const params = new URLSearchParams();
                if (selectedType) params.set("type", selectedType);
                if (selectedMonth) params.set("month", selectedMonth);
                navigate(`/packages${params.toString() ? `?${params.toString()}` : ""}`);
              }}
            >
              {t("hero.searchBtn")}
            </Button>
          </div>
        </motion.div>
      </div>

    </section>
  );
};

export default Hero;
