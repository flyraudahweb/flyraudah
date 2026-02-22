import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Plane, MapPin, Check, Star, ChevronDown, ChevronUp, Hotel } from "lucide-react";
import { motion } from "framer-motion";
import { formatPrice } from "@/data/packages";
import { useTrackActivity } from "@/hooks/useTrackActivity";
import { Lock } from "lucide-react";

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
  const { trackActivity } = useTrackActivity();
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
      className={`group rounded-3xl overflow-hidden transition-all duration-500
        bg-white/5 backdrop-blur-xl
        border border-slate-200/50 hover:border-slate-200/70
        shadow-[0_8px_32px_0_rgba(0,0,0,0.28)] hover:shadow-[0_16px_48px_0_rgba(0,0,0,0.35)]
        ${tier.border} ${tier.glowClass}
        hover:-translate-y-2`}
    >
      {/* Card Header */}
      <div className={`px-6 pt-6 pb-4 glass-gradient ${pkg.category === "premium" ? "bg-gradient-to-br from-primary/10 to-secondary/10" : ""}`}>
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

        {/* Capacity / Availability */}
        {(() => {
          const capacity = pkg.capacity || 0;
          const available = pkg.available ?? capacity;
          const booked = capacity - available;
          const fillPct = capacity > 0 ? Math.round((booked / capacity) * 100) : 0;
          const isFull = capacity > 0 && available <= 0;
          const isAlmostFull = capacity > 0 && !isFull && fillPct >= 80;

          if (capacity <= 0) return null;

          const bgTint = isFull
            ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
            : isAlmostFull
              ? "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
              : "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800";

          const barColor = isFull ? "bg-red-500" : isAlmostFull ? "bg-amber-500" : "bg-emerald-500";

          const statusEl = isFull ? (
            <span className="flex items-center gap-1 text-red-600 font-bold text-sm">
              <Lock className="h-4 w-4" /> SOLD OUT
            </span>
          ) : isAlmostFull ? (
            <span className="text-amber-600 font-bold text-sm">⚡ Almost Full!</span>
          ) : (
            <span className="text-emerald-700 font-bold text-sm">🪑 {available} spots left</span>
          );

          return (
            <div className={`mb-4 rounded-lg border p-3 ${bgTint}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Availability
                </span>
                {statusEl}
              </div>
              <div className="h-3 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                  style={{ width: `${fillPct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {booked} of {capacity} seats booked
              </p>
            </div>
          );
        })()}

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
        {(() => {
          const capacity = pkg.capacity || 0;
          const available = pkg.available ?? capacity;
          const isFull = capacity > 0 && available <= 0;

          return (
            <div className="flex gap-2">
              <Link
                to={`/packages/${pkg.id}`}
                className="flex-1"
                onClick={() => trackActivity({ eventType: "package_view", packageId: pkg.id, metadata: { packageName: pkg.name } })}
              >
                <Button variant="outline" className="w-full border-secondary/40 text-secondary hover:bg-secondary/10 font-medium">
                  {t("packages.viewDetails")}
                </Button>
              </Link>
              {isFull ? (
                <Button disabled className="flex-1 opacity-50 cursor-not-allowed font-semibold">
                  <Lock className="h-4 w-4 mr-1.5" /> Sold Out
                </Button>
              ) : (
                <Link
                  to={`/dashboard/book/${pkg.id}`}
                  className="flex-1"
                  onClick={() => trackActivity({ eventType: "booking_start", packageId: pkg.id, metadata: { packageName: pkg.name } })}
                >
                  <Button className="w-full gold-gradient text-secondary-foreground shadow-gold hover:shadow-gold-lg transition-all font-semibold">
                    {t("packages.bookNow")}
                  </Button>
                </Link>
              )}
            </div>
          );
        })()}
      </div>
    </motion.div>
  );
};

export default PackageCard;
