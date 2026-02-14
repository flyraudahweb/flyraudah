import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Plane, MapPin, Check } from "lucide-react";
import { motion } from "framer-motion";
import { packages, formatPrice, type TravelPackage } from "@/data/packages";

const categoryColors: Record<string, string> = {
  premium: "bg-secondary text-secondary-foreground",
  standard: "bg-primary text-primary-foreground",
  budget: "bg-muted text-muted-foreground",
};

const PackageCard = ({ pkg, index }: { pkg: TravelPackage; index: number }) => {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group bg-card border border-secondary/30 rounded-xl overflow-hidden hover:shadow-gold-lg hover:-translate-y-1 transition-all duration-300"
    >
      {/* Top color bar */}
      <div className="h-2 gold-gradient" />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <Badge className={categoryColors[pkg.category]}>
            {t(`packages.${pkg.category}`)}
          </Badge>
          <Badge variant="outline" className="border-secondary text-secondary">
            {pkg.type === "hajj" ? t("packages.hajj") : t("packages.umrah")}
          </Badge>
        </div>

        <h3 className="font-heading text-lg font-bold text-foreground mb-3 leading-snug">
          {pkg.name}
        </h3>

        {/* Details */}
        <div className="space-y-2 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-secondary" />
            <span>{t("packages.duration")}: {pkg.duration}</span>
          </div>
          <div className="flex items-center gap-2">
            <Plane className="h-4 w-4 text-secondary" />
            <span>{pkg.airlines.join(" / ")}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-secondary" />
            <span>{pkg.departureCities.join(", ")}</span>
          </div>
        </div>

        {/* Inclusions */}
        <div className="space-y-1 mb-5">
          {pkg.inclusions.slice(0, 4).map((item) => (
            <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
              <Check className="h-3 w-3 text-secondary shrink-0" />
              <span>{item}</span>
            </div>
          ))}
          {pkg.inclusions.length > 4 && (
            <p className="text-xs text-secondary font-medium">+{pkg.inclusions.length - 4} more</p>
          )}
        </div>

        {/* Price */}
        <div className="mb-5">
          <span className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-full font-bold text-lg border-2 border-secondary">
            {formatPrice(pkg.price)}
          </span>
          {pkg.depositAllowed && pkg.minimumDeposit && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("packages.deposit")} {formatPrice(pkg.minimumDeposit)}
            </p>
          )}
        </div>

        {/* Availability */}
        <p className="text-xs text-muted-foreground mb-4">
          {pkg.available} {t("packages.spotsLeft")}
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 border-secondary text-secondary hover:bg-secondary/10">
            {t("packages.viewDetails")}
          </Button>
          <Button className="flex-1 gold-gradient text-secondary-foreground shadow-gold hover:shadow-gold-lg transition-all">
            {t("packages.bookNow")}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

const PackagesSection = () => {
  const { t } = useTranslation();

  return (
    <section id="packages" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
            {t("packages.title")}
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            {t("packages.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages
            .filter((p) => p.status === "active")
            .map((pkg, i) => (
              <PackageCard key={pkg.id} pkg={pkg} index={i} />
            ))}
        </div>
      </div>
    </section>
  );
};

export default PackagesSection;
