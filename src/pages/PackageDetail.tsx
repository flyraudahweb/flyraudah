import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Home, ChevronRight, CalendarDays, Plane, MapPin, Check, Star, Hotel, Lock } from "lucide-react";
import { formatPrice } from "@/data/packages";
import { motion } from "framer-motion";

const PackageDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: pkg, isLoading, error } = useQuery({
    queryKey: ["package", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("*, package_accommodations(*), package_dates(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <Header />
        <section className="container mx-auto px-4 py-20">
          <Skeleton className="h-96 w-full mb-8" />
          <Skeleton className="h-20 w-full mb-4" />
          <Skeleton className="h-40 w-full" />
        </section>
        <Footer />
      </div>
    );
  }

  if (error || !pkg) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <Header />
        <section className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">Package Not Found</h1>
          <Button onClick={() => navigate("/packages")}>Back to Packages</Button>
        </section>
        <Footer />
      </div>
    );
  }

  const tierConfig: any = {
    premium: { badge: "bg-secondary text-secondary-foreground", label: "PREMIUM" },
    standard: { badge: "bg-primary text-primary-foreground", label: "STANDARD" },
    budget: { badge: "bg-muted text-muted-foreground", label: "VALUE" },
  };

  const tier = tierConfig[pkg.category] || tierConfig.standard;
  const capacity = pkg.capacity || 1;
  const available = pkg.available ?? capacity;
  const filledSpots = capacity - available;
  const fillPercentage = capacity > 0 ? (filledSpots / capacity) * 100 : 0;

  // Get accommodation data
  const makkahAccom = pkg.package_accommodations?.find((a: any) => a.city === "Makkah");
  const madinahAccom = pkg.package_accommodations?.find((a: any) => a.city === "Madinah");

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <Header />

      {/* Hero */}
      <section className="relative pt-28 pb-12 bg-muted/20 border-b border-border/50">
        <div className="container mx-auto px-4 sm:px-8 lg:px-12 relative z-10">
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
            <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
              <Home className="h-3.5 w-3.5" />Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link to="/packages" className="hover:text-primary transition-colors">
              Packages
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium">{pkg.name}</span>
          </nav>
          <h1 className="font-heading text-4xl font-bold text-foreground">{pkg.name}</h1>
          <div className="ornament-divider mt-3 mb-0 [&::before]:bg-gradient-to-r [&::before]:from-transparent [&::before]:via-border [&::before]:to-transparent [&::after]:bg-gradient-to-r [&::after]:from-transparent [&::after]:via-border [&::after]:to-transparent">
            <div className="diamond !bg-secondary/40" />
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="container mx-auto px-4 sm:px-8 lg:px-12 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <Badge className={`${tier.badge} font-bold`}>{tier.label}</Badge>
                <Badge variant="outline">{pkg.type === "hajj" ? t("packages.hajj") : t("packages.umrah")}</Badge>
              </div>

              <div className="mb-6">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">From</p>
                <p className="text-4xl font-bold text-secondary">{formatPrice(pkg.price)}</p>
                {pkg.deposit_allowed && pkg.minimum_deposit && (
                  <p className="text-sm text-muted-foreground mt-2">Deposit: {formatPrice(pkg.minimum_deposit)}</p>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {pkg.duration && (
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-secondary" />
                    <span>{pkg.duration}</span>
                  </div>
                )}
                {pkg.airlines?.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Plane className="h-4 w-4 text-secondary" />
                    <span>{pkg.airlines.join("/")}</span>
                  </div>
                )}
                {pkg.departure_cities?.length > 0 && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-secondary" />
                    <span>{pkg.departure_cities.length} Cities</span>
                  </div>
                )}
              </div>
            </div>

            {/* Capacity */}
            {capacity > 0 && (
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-heading text-lg font-bold text-foreground mb-4">Availability</h3>
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-muted-foreground">{filledSpots}/{capacity} booked</span>
                  {available <= 0 ? (
                    <span className="flex items-center gap-1 text-red-500 font-semibold text-sm">
                      <Lock className="h-3.5 w-3.5" /> SOLD OUT
                    </span>
                  ) : fillPercentage >= 80 ? (
                    <span className="text-amber-600 font-semibold text-sm">Almost Full! {available} left</span>
                  ) : (
                    <span className="text-emerald-600 font-medium text-sm">{available} spots remaining</span>
                  )}
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${available <= 0 ? "bg-red-500" : fillPercentage >= 80 ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                    style={{ width: `${fillPercentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* Inclusions */}
            {pkg.inclusions?.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-heading text-lg font-bold text-foreground mb-4">Package Inclusions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pkg.inclusions.map((item: string) => (
                    <div key={item} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Accommodations */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-heading text-lg font-bold text-foreground mb-4">Accommodations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[makkahAccom, madinahAccom].map((accom, idx) => (
                  accom && (
                    <div key={idx} className="border border-border rounded-lg p-4">
                      <p className="font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Hotel className="h-4 w-4 text-secondary" />
                        {accom.city}
                      </p>
                      <p className="text-sm font-medium text-foreground mb-1">{accom.hotel}</p>
                      <div className="flex gap-0.5 mb-2">
                        {Array.from({ length: accom.rating }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-secondary text-secondary" />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {accom.distance_from_haram || accom.distance_from_masjid}
                      </p>
                      {accom.room_types?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {accom.room_types.map((type: string) => (
                            <Badge key={type} variant="secondary" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                ))}
              </div>
            </div>

            {/* Travel Dates */}
            {pkg.package_dates?.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-heading text-lg font-bold text-foreground mb-4">Available Travel Dates</h3>
                <div className="space-y-3">
                  {pkg.package_dates.map((date: any) => (
                    <div key={date.id} className="border border-border rounded-lg p-3">
                      <p className="font-medium text-foreground">
                        {date.outbound} → {date.return_date}
                      </p>
                      {date.islamic_date && <p className="text-xs text-muted-foreground">Islamic: {date.islamic_date}</p>}
                      {date.airline && <p className="text-xs text-muted-foreground">Airline: {date.airline}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {pkg.description && (
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-heading text-lg font-bold text-foreground mb-4">About This Package</h3>
                <p className="text-muted-foreground">{pkg.description}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-xl p-6 sticky top-24 space-y-4"
            >
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Price</p>
                <p className="text-3xl font-bold text-secondary">{formatPrice(pkg.price)}</p>
              </div>

              {available > 0 ? (
                <Button
                  onClick={() => navigate(`/dashboard/book/${pkg.id}`)}
                  className="w-full gold-gradient text-secondary-foreground font-semibold py-6"
                >
                  Book Now
                </Button>
              ) : (
                <Button disabled className="w-full opacity-50 cursor-not-allowed" size="lg">
                  <Lock className="h-4 w-4 mr-2" /> Sold Out
                </Button>
              )}

              <Button variant="outline" onClick={() => navigate("/packages")} className="w-full">
                Back to Packages
              </Button>

              <div className="pt-4 border-t border-border text-xs text-muted-foreground space-y-2">
                <p>✓ Secure Booking</p>
                <p>✓ Expert Guides</p>
                <p>✓ Premium Hotels</p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default PackageDetail;
