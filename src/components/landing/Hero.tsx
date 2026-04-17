import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import BecomeAgentDialog from "@/components/landing/BecomeAgentDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Search, ChevronDown, Sparkles, MapPin, Calendar, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import heroBg from "@/assets/hero-bg.jpg";

const heroImages = [
  heroBg,
  "https://i.ibb.co/d4SNVd8w/peopleattheairport.jpg",
  "https://i.ibb.co/fVmC1j7k/medinamosque.jpg",
];

const Hero = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [persons, setPersons] = useState("");
  const [agentDialogOpen, setAgentDialogOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const { data: monthOptions = [] } = useQuery({
    queryKey: ["hero-month-options"],
    queryFn: async () => {
      const { data } = await supabase
        .from("packages")
        .select("package_dates(outbound)")
        .eq("status", "active");
      const months = new Set<string>();
      data?.forEach((pkg: any) =>
        pkg.package_dates?.forEach((d: any) => {
          months.add(format(parseISO(d.outbound), "yyyy-MM"));
        })
      );
      return Array.from(months).sort().map((m) => ({
        value: m,
        label: format(parseISO(`${m}-01`), "MMMM yyyy"),
      }));
    },
  });

  const titleWords = (t("hero.title") as string).split(" ");

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 hero-gradient" />

      {/* Background image crossfade (subtle behind gradient) */}
      <AnimatePresence mode="sync">
        <motion.div
          key={currentSlide}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-15 mix-blend-overlay"
          style={{ backgroundImage: `url(${heroImages[currentSlide]})` }}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 0.15, scale: 1.05 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 2, ease: "easeInOut" }, scale: { duration: 20, ease: "linear" } }}
        />
      </AnimatePresence>

      {/* Decorative floating blobs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl float-blob" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl float-blob-alt" />
      <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-white/8 rounded-full blur-2xl float-blob" />

      {/* Geometric islamic pattern (very subtle) */}
      <div className="absolute inset-0 geometric-overlay opacity-20" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 sm:px-10 lg:px-16 pt-36 lg:pt-44 pb-28">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left Column */}
          <div className="w-full lg:w-1/2 flex flex-col items-start text-left">
            {/* Pill badge */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md text-white text-sm font-semibold px-5 py-2 rounded-full mb-8 border border-white/20"
            >
              <Sparkles className="h-4 w-4" />
              Nigeria's Most Trusted Hajj & Umrah Partner
            </motion.div>

            {/* Staggered title */}
            <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-black leading-tight">
              {titleWords.map((word, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.15 * i, ease: "easeOut" }}
                  className="inline-block mr-[0.3em] text-white"
                  style={{ textShadow: "0 2px 20px rgba(0, 0, 0, 0.15)" }}
                >
                  {word}
                </motion.span>
              ))}
            </h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="text-lg text-white/85 max-w-xl tracking-wide mt-6"
            >
              {t("hero.subtitle")}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.9 }}
              className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
            >
              <Button
                size="lg"
                className="bg-white text-[#2BB673] hover:bg-white/90 shadow-soft-xl hover:shadow-2xl hover:-translate-y-1 transition-all text-base px-8 py-6 font-bold rounded-full w-full sm:w-auto"
                onClick={() => document.getElementById("packages")?.scrollIntoView({ behavior: "smooth" })}
              >
                {t("hero.explore")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-white/40 text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 text-base px-8 py-6 rounded-full font-semibold w-full sm:w-auto"
                onClick={() => setAgentDialogOpen(true)}
              >
                Become an Agent
              </Button>
            </motion.div>
          </div>

          {/* Right Column - Video */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="w-full lg:w-1/2 relative aspect-[4/3] lg:aspect-square"
          >
            <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full" />
            <div className="relative h-full w-full rounded-3xl overflow-hidden shadow-2xl border-4 border-white/10">
              <video 
                src="/vid.mp4" 
                autoPlay 
                loop 
                muted 
                playsInline 
                className="w-full h-full object-cover" 
              />
            </div>
          </motion.div>
        </div>

        {/* Search Widget */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.1 }}
          className="mt-12 lg:mt-[-3rem] max-w-5xl mx-auto bg-white/95 backdrop-blur-md rounded-3xl md:rounded-full p-2 md:pl-2 shadow-soft-xl relative z-20 flex flex-col md:flex-row items-center divide-y md:divide-y-0 md:divide-x divide-gray-200"
        >
          {/* Package Type */}
          <div className="flex-1 flex items-center gap-3 w-full p-4 md:px-6">
            <MapPin className="h-6 w-6 text-gray-700" strokeWidth={1.5} />
            <div className="flex-1 text-left">
              <label className="block text-sm font-bold text-gray-900 mb-0.5">Package Type</label>
              <div className="relative">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full bg-transparent text-sm text-gray-500 focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="">Select your type</option>
                  <option value="hajj">{t("packages.hajj")}</option>
                  <option value="umrah">{t("packages.umrah")}</option>
                </select>
                <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Month */}
          <div className="flex-1 flex items-center gap-3 w-full p-4 md:px-6">
            <Calendar className="h-6 w-6 text-gray-700" strokeWidth={1.5} />
            <div className="flex-1 text-left">
              <label className="block text-sm font-bold text-gray-900 mb-0.5">Month</label>
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full bg-transparent text-sm text-gray-500 focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="">Add a date</option>
                  {monthOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Persons */}
          <div className="flex-1 flex items-center gap-3 w-full p-4 md:px-6">
            <Users className="h-6 w-6 text-gray-700" strokeWidth={1.5} />
            <div className="flex-1 text-left">
              <label className="block text-sm font-bold text-gray-900 mb-0.5">Number of Persons</label>
              <input
                type="number"
                min="1"
                placeholder="Enter number"
                value={persons}
                onChange={(e) => setPersons(e.target.value)}
                className="w-full bg-transparent text-sm text-gray-500 focus:outline-none placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Search Button */}
          <div className="w-full md:w-auto p-2">
            <Button
              className="w-full md:w-16 md:h-16 rounded-2xl md:rounded-full bg-[#111827] hover:bg-black text-white flex items-center justify-center p-0 transition-transform hover:scale-105 shadow-md"
              onClick={() => {
                const params = new URLSearchParams();
                if (selectedType) params.set("type", selectedType);
                if (selectedMonth) params.set("month", selectedMonth);
                if (persons) params.set("persons", persons);
                navigate(`/packages${params.toString() ? `?${params.toString()}` : ""}`);
              }}
            >
              <Search className="h-6 w-6" strokeWidth={2.5} />
              <span className="md:hidden ml-2 font-bold">{t("hero.searchBtn")}</span>
            </Button>
          </div>
        </motion.div>
      </div>

      <BecomeAgentDialog open={agentDialogOpen} onOpenChange={setAgentDialogOpen} />
    </section>
  );
};

export default Hero;
