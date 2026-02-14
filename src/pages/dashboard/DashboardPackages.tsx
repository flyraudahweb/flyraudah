import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Plane, MapPin, Star } from "lucide-react";
import { formatPrice } from "@/data/packages";

const categoryConfig: Record<string, { badge: string; label: string }> = {
  premium: { badge: "bg-secondary text-secondary-foreground", label: "PREMIUM" },
  standard: { badge: "bg-primary text-primary-foreground", label: "STANDARD" },
  budget: { badge: "bg-muted text-muted-foreground", label: "VALUE" },
};

const DashboardPackages = () => {
  const { t } = useTranslation();

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["active-packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("*, package_accommodations(*)")
        .eq("status", "active")
        .order("featured", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          {t("dashboard.packages.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("dashboard.packages.subtitle")}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {packages.map((pkg) => {
            const cat = categoryConfig[pkg.category] || categoryConfig.standard;
            const filledSpots = pkg.capacity - pkg.available;
            const fillPct = (filledSpots / pkg.capacity) * 100;

            return (
              <Card key={pkg.id} className="border-border hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <Badge className={`${cat.badge} text-xs font-bold`}>{cat.label}</Badge>
                    <Badge variant="outline" className="text-xs">
                      {pkg.type === "hajj" ? t("packages.hajj") : t("packages.umrah")}
                    </Badge>
                  </div>

                  <h3 className="font-heading text-lg font-bold text-foreground mb-2">{pkg.name}</h3>

                  <p className="text-2xl font-heading font-bold text-secondary mb-3">
                    {formatPrice(Number(pkg.price))}
                  </p>

                  <div className="space-y-1.5 text-sm text-muted-foreground mb-3">
                    {pkg.duration && (
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5 text-secondary" />
                        <span>{pkg.duration}</span>
                      </div>
                    )}
                    {pkg.airlines?.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Plane className="h-3.5 w-3.5 text-secondary" />
                        <span>{pkg.airlines.join(" / ")}</span>
                      </div>
                    )}
                    {pkg.departure_cities?.length > 0 && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-secondary" />
                        <span>{pkg.departure_cities.join(", ")}</span>
                      </div>
                    )}
                  </div>

                  {/* Capacity */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{filledSpots}/{pkg.capacity} booked</span>
                      {pkg.available <= 20 && (
                        <span className="text-destructive font-semibold">Only {pkg.available} left!</span>
                      )}
                    </div>
                    <div className="capacity-bar">
                      <div className="capacity-bar-fill" style={{ width: `${fillPct}%` }} />
                    </div>
                  </div>

                  <Button className="w-full gold-gradient text-secondary-foreground font-semibold">
                    <Link to={`/dashboard/book/${pkg.id}`} className="block w-full">
                      {t("packages.bookNow")}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DashboardPackages;
