import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Plane, MapPin, Check, Star, ChevronDown, ChevronUp, Hotel } from "lucide-react";
import { motion } from "framer-motion";
import { formatPrice } from "@/data/packages";

export const tierConfig: Record<string, { border: string; badge: string; badgeLabel: string; glowClass: string }> = {
  premium: {
    border: "tier-premium",
    badge: "bg-secondary text-secondary-foreground",
    badgeLabel: "PREMIUM",
    glowClass: "hover:shadow-gold-glow",
  },
  standard: {
    border: "tier-standard",
    badge: "bg-primary text-primary-foreground",
    badgeLabel: "STANDARD",
    glowClass: "hover:shadow-lg",
  },
  budget: {
    border: "tier-budget",
    badge: "bg-muted text-muted-foreground",
    badgeLabel: "VALUE",
    glowClass: "hover:shadow-md",
  },
};

const PackageCard = ({ pkg, index }: { pkg: any; index: number }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const tier = tierConfig[pkg.category];

  // Normalize field names (support both camelCase local and snake_case Supabase)
  const depositAllowed = pkg.depositAllowed ?? pkg.deposit_allowed;
  const minimumDeposit = pkg.minimumDeposit ?? pkg.minimum_deposit;
  const departureCities = pkg.departure_cities ?? pkg.departureCities ?? [];

  // Accommodations: from joined array or legacy objects
  const accommodations = pkg.package_accommodations || [];
  const makkah = accommodations.find((a: any) => a.city?.toLowerCase() === "makkah") || pkg.makkah;
  const madinah = accommodations.find((a: any) => a.city?.toLowerCase() === "madinah") || pkg.madinah;

  // Dates: from joined array or legacy
  const dates = pkg.package_dates || pkg.dates || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`group bg-card rounded-xl overflow-hidden transition-all duration-300 ${tier.border} ${tier.glowClass} hover:-translate-y-2 border border-border`}
    >
      {/* Card Header */}
      <div className={`px-6 pt-6 pb-4 ${pkg.category === "premium" ? "bg-gradient-to-br from-primary/5 to-secondary/5" : ""}`}>
        <div className="flex items-start justify-between mb-3">
          <Badge className={`${tier.badge} font-bold text-xs tracking-wider`}>
            {tier.badgeLabel}
          </Badge>
          <Badge variant="outline" className="border-secondary/50 text-secondary text-xs">
            {pkg.type === "hajj" ? t("packages.hajj") : t("packages.umrah")}
          </Badge>
        </div>

        <h3 className="font-heading text-xl font-bold text-foreground mb-4 leading-snug">
          {pkg.name}
        </h3>

        {/* Price */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">From</p>
          <span
            className="font-heading text-3xl font-bold text-secondary"
            style={{ textShadow: "0 2px 12px hsla(43, 56%, 52%, 0.2)" }}
          >
            {formatPrice(pkg.price)}
          </span>
          {depositAllowed && minimumDeposit && (
            <span className="ml-3 inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold border border-primary/20">
              Deposit: {formatPrice(minimumDeposit)}
            </span>
          )}
          {!depositAllowed && (
            <span className="ml-3 inline-block bg-muted text-muted-foreground px-3 py-1 rounded-full text-xs font-medium">
              Full Payment
            </span>
          )}
        </div>
      </div>

      <div className="px-6 pb-6">
        {/* Details */}
        <div className="space-y-2 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-secondary" />
            <span>{t("packages.duration")}: {pkg.duration}</span>
          </div>
          <div className="flex items-center gap-2">
            <Plane className="h-4 w-4 text-secondary" />
            <span>{pkg.airlines?.join(" / ")}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-secondary" />
            <span>{departureCities.join(", ")}</span>
          </div>
        </div>

        {/* Inclusions - 2 column */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 mb-4">
          {(pkg.inclusions || []).slice(0, 4).map((item: string) => (
            <div key={item} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Check className="h-3 w-3 text-secondary shrink-0" />
              <span className="truncate">{item}</span>
            </div>
          ))}
        </div>

        {/* Expandable details */}
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 space-y-3 border-t border-border pt-4"
          >
            {(pkg.inclusions || []).length > 4 && (
              <div>
                <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">All Inclusions</p>
                <div className="grid grid-cols-1 gap-1">
                  {(pkg.inclusions || []).map((item: string) => (
                    <div key={item} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="h-3 w-3 text-secondary shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(makkah || madinah) && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Makkah", data: makkah },
                  { label: "Madinah", data: madinah },
                ].filter((acc) => acc.data).map((acc) => (
                  <div key={acc.label} className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
                      <Hotel className="h-3 w-3 text-secondary" />
                      {acc.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{acc.data.hotel}</p>
                    <div className="flex gap-0.5 mt-1">
                      {Array.from({ length: acc.data.rating || 0 }).map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-secondary text-secondary" />
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {acc.data.distance_from_haram || acc.data.distanceFromHaram || acc.data.distance_from_masjid || acc.data.distanceFromMasjid}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {dates.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">Travel Dates</p>
                <div className="space-y-1">
                  {dates.slice(0, 3).map((d: any) => (
                    <p key={d.id} className="text-xs text-muted-foreground">
                      {d.outbound} → {d.return_date || d.return} {d.airline && `(${d.airline})`}
                    </p>
                  ))}
                  {dates.length > 3 && (
                    <p className="text-xs text-secondary font-medium">+{dates.length - 3} more dates</p>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 text-xs text-secondary font-medium py-2 mb-4 hover:text-secondary/80 transition-colors"
        >
          {expanded ? (
            <>Less Details <ChevronUp className="h-3 w-3" /></>
          ) : (
            <>More Details <ChevronDown className="h-3 w-3" /></>
          )}
        </button>

        {/* Actions */}
        <div className="flex gap-2">
          <Link to={`/packages/${pkg.id}`} className="flex-1">
            <Button variant="outline" className="w-full border-secondary/40 text-secondary hover:bg-secondary/10 font-medium">
              {t("packages.viewDetails")}
            </Button>
          </Link>
          <Link to={`/dashboard/book/${pkg.id}`} className="flex-1">
            <Button className="w-full gold-gradient text-secondary-foreground shadow-gold hover:shadow-gold-lg transition-all font-semibold">
              {t("packages.bookNow")}
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default PackageCard;
