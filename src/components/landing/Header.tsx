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
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        scrolled
          ? "bg-primary/85 backdrop-blur-xl border-b border-white/10 shadow-lg"
          : "bg-transparent"
      )}
    >
      <div className="container mx-auto px-6 sm:px-10 lg:px-16 flex items-center justify-between h-16 md:h-20">
        {/* Logo */}
        <Link to="/#home" className="flex items-center">
          <img
            src="/logo.png"
            alt="Raudah Travels & Tours"
            className={cn(
              "h-10 md:h-12 w-auto object-contain transition-all",
              scrolled ? "brightness-0 invert" : "brightness-0"
            )}
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-secondary",
                scrolled ? "text-background" : "text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "hover:text-secondary hover:bg-primary-foreground/10",
                  scrolled ? "text-background" : "text-foreground"
                )}
              >
                <Globe className="h-4 w-4 mr-1" />
                {currentLang.flag} {currentLang.code.toUpperCase()}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {languages.map((lang) => (
                <DropdownMenuItem key={lang.code} onClick={() => changeLang(lang.code)}>
                  {lang.flag} {lang.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Link to="/login">
            <Button variant="outline" size="sm" className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground">
              {t("nav.login")}
            </Button>
          </Link>
          <Link to="/register">
            <Button size="sm" className="gold-gradient text-secondary-foreground shadow-gold hover:shadow-gold-lg hover:-translate-y-0.5 transition-all">
              {t("nav.signup")}
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className={cn(
            "md:hidden p-2 rounded-full transition-all",
            mobileOpen && "bg-white/20 ring-2 ring-white/30"
          )}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? (
            <X className={cn("h-6 w-6", scrolled ? "text-background" : "text-foreground")} />
          ) : (
            <Menu className={cn("h-6 w-6", scrolled ? "text-background" : "text-foreground")} />
          )}
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-40 md:hidden glass-morph flex flex-col items-center justify-center p-8 pt-24"
          >
            {/* Close button inside drawer */}
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-5 right-5 w-11 h-11 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all"
            >
              <X className="h-6 w-6 text-foreground" />
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
                    className="text-2xl font-heading font-bold text-foreground hover:text-secondary transition-colors"
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
                className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10"
              >
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => { changeLang(lang.code); setMobileOpen(false); }}
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all",
                      i18n.language === lang.code
                        ? "bg-secondary text-secondary-foreground shadow-gold scale-110"
                        : "bg-white/10 text-muted-foreground hover:bg-white/20"
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
                  <Button variant="outline" className="w-full h-14 border-secondary/50 text-secondary text-lg font-bold rounded-xl bg-white/5 hover:bg-secondary/10">
                    {t("nav.login")}
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full h-14 gold-gradient text-secondary-foreground shadow-gold text-lg font-bold rounded-xl">
                    {t("nav.signup")}
                  </Button>
                </Link>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
