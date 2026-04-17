import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Menu, X, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import TopBar from "./TopBar";

const languages = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ha", label: "Hausa", flag: "🇳🇬" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
];

const Header = ({ forceDark = false }: { forceDark?: boolean }) => {
  const { t, i18n } = useTranslation();
  const [scrolled, setScrolled] = useState(forceDark);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (forceDark) return; // skip scroll listener if always dark
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [forceDark]);

  const changeLang = (code: string) => {
    i18n.changeLanguage(code);
    document.documentElement.dir = code === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = code;
  };

  const currentLang = languages.find((l) => l.code === i18n.language) || languages[0];

  const navLinks = [
    { label: t("nav.home"), href: "/#home" },
    { label: t("nav.packages"), href: "/packages" },
    { label: t("nav.about"), href: "/#about" },
    { label: t("nav.contact"), href: "/#contact" },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <TopBar />
      <div className="w-full transition-all duration-500">
        <header
          className={cn(
            "pointer-events-auto w-full flex items-center justify-between px-6 sm:px-10 lg:px-16 py-2 md:py-2.5 transition-all duration-300",
            scrolled ? "bg-white shadow-sm translate-y-0" : "bg-white/10 backdrop-blur-md border-b border-white/20"
          )}
        >
          {/* Logo - Free without bg */}
          <Link to="/#home" className="flex items-center">
            <img
              src="/logo.png"
              alt="Raudah"
              className={cn(
                "h-8 md:h-10 w-auto object-contain transition-all duration-300",
                scrolled ? "brightness-100" : "brightness-0 invert"
              )}
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "text-sm font-bold transition-colors tracking-wide",
                  scrolled ? "text-gray-900 hover:text-[#2BB673]" : "text-white/90 hover:text-white"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "rounded-full h-10 w-10 transition-colors",
                    scrolled ? "text-gray-700 hover:text-black hover:bg-gray-100" : "text-white hover:bg-white/10"
                  )}
                >
                  <Globe className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl shadow-soft-lg border-gray-100">
                {languages.map((lang) => (
                  <DropdownMenuItem key={lang.code} onClick={() => changeLang(lang.code)} className="rounded-lg">
                    {lang.flag} {lang.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Link to="/login">
              <Button
                variant="ghost"
                className={cn(
                  "font-bold rounded-full px-4 h-10 transition-colors",
                  scrolled ? "text-gray-900 hover:bg-gray-100" : "text-white hover:bg-white/10"
                )}
              >
                {t("nav.login")}
              </Button>
            </Link>

            {/* Green Signup Action */}
            <Link to="/register">
              <Button
                className="bg-[#2BB673] text-white hover:bg-[#208f5a] px-6 h-10 border border-[#2BB673]/20 shadow-md rounded-full font-bold ml-1 transition-all hover:-translate-y-0.5"
              >
                {t("nav.signup")}
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className={cn(
              "md:hidden p-2 rounded-full transition-all",
              scrolled ? "text-gray-900 hover:bg-gray-100" : "text-white hover:bg-white/10",
              mobileOpen && (scrolled ? "bg-gray-100" : "bg-white/20")
            )}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </header>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-40 md:hidden bg-white flex flex-col items-center justify-center p-8 pt-24"
          >
            {/* Close button inside drawer */}
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-5 right-5 w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-all"
            >
              <X className="h-6 w-6 text-gray-800" />
            </button>

            <nav className="flex flex-col items-center gap-8 w-full max-w-xs">
              {navLinks.map((link, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  key={link.href}
                >
                  <Link
                    to={link.href}
                    className="text-2xl font-bold text-gray-800 hover:text-[#2BB673] transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex gap-4 p-4 rounded-2xl bg-gray-50"
              >
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => { changeLang(lang.code); setMobileOpen(false); }}
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all",
                      i18n.language === lang.code
                        ? "primary-gradient text-white shadow-gold scale-110"
                        : "bg-white text-gray-500 hover:bg-gray-100 shadow-sm"
                    )}
                  >
                    {lang.flag}
                  </button>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col gap-4 w-full"
              >
                <Link to="/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="w-full h-14 border-[#2BB673]/30 text-[#2BB673] text-lg font-bold rounded-xl bg-green-50/50 hover:bg-green-50">
                    {t("nav.login")}
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full h-14 primary-gradient text-white shadow-gold text-lg font-bold rounded-xl">
                    {t("nav.signup")}
                  </Button>
                </Link>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Header;
