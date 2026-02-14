import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Menu, X, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const languages = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ha", label: "Hausa", flag: "🇳🇬" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
];

const Header = () => {
  const { t, i18n } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const changeLang = (code: string) => {
    i18n.changeLanguage(code);
    document.documentElement.dir = code === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = code;
  };

  const currentLang = languages.find((l) => l.code === i18n.language) || languages[0];

  const navLinks = [
    { label: t("nav.home"), href: "#home" },
    { label: t("nav.packages"), href: "/packages" },
    { label: t("nav.about"), href: "#about" },
    { label: t("nav.contact"), href: "#contact" },
  ];

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-background/95 backdrop-blur-md shadow-md"
          : "bg-transparent"
      )}
    >
      <div className="container mx-auto px-4 sm:px-8 lg:px-12 flex items-center justify-between h-16 md:h-20">
        {/* Logo */}
        <a href="#home" className="flex items-center">
          <img
            src="https://i.ibb.co/C3zkfpVR/Rauda-Logo-2-PNG.png"
            alt="Raudah Travels & Tours"
            className={cn(
              "h-10 md:h-12 w-auto object-contain transition-all",
              !scrolled && "brightness-0 invert"
            )}
          />
        </a>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-secondary",
                scrolled ? "text-foreground" : "text-background"
              )}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className={cn(scrolled ? "text-foreground" : "text-background")}>
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
          <Button variant="outline" size="sm" className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground">
            {t("nav.login")}
          </Button>
          <Button size="sm" className="gold-gradient text-secondary-foreground shadow-gold hover:shadow-gold-lg hover:-translate-y-0.5 transition-all">
            {t("nav.signup")}
          </Button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? (
            <X className={cn("h-6 w-6", scrolled ? "text-foreground" : "text-background")} />
          ) : (
            <Menu className={cn("h-6 w-6", scrolled ? "text-foreground" : "text-background")} />
          )}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-background border-t border-border animate-fade-in">
          <nav className="flex flex-col p-4 gap-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-foreground font-medium py-2 hover:text-secondary"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="flex gap-2 pt-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => { changeLang(lang.code); setMobileOpen(false); }}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm",
                    i18n.language === lang.code
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {lang.flag}
                </button>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 border-secondary text-secondary">
                {t("nav.login")}
              </Button>
              <Button className="flex-1 gold-gradient text-secondary-foreground shadow-gold">
                {t("nav.signup")}
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
