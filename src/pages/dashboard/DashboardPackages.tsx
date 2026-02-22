import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarDays, Plane, MapPin, Star, Search,
  Package, Flame, Filter, Users
} from "lucide-react";
import { formatPrice } from "@/data/packages";

const categoryConfig: Record<string, { badge: string; label: string; icon: typeof Star }> = {
  premium: { badge: "bg-amber-500 text-white", label: "PREMIUM", icon: Star },
  standard: { badge: "bg-primary text-primary-foreground", label: "STANDARD", icon: Package },
  budget: { badge: "bg-slate-500 text-white", label: "VALUE", icon: Package },
};

const typeConfig: Record<string, { className: string }> = {
  hajj: { className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
  umrah: { className: "bg-sky-500/10 text-sky-700 border-sky-500/30" },
};

const DashboardPackages = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "hajj" | "umrah">("all");

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

  const filtered = packages.filter((pkg) => {
    const matchType = typeFilter === "all" || pkg.type === typeFilter;
    const matchSearch =
      !search ||
      pkg.name.toLowerCase().includes(search.toLowerCase()) ||
      (pkg.departure_cities || []).some((c: string) => c.toLowerCase().includes(search.toLowerCase()));
    return matchType && matchSearch;
  });

  const hajjCount = packages.filter((p) => p.type === "hajj").length;
  const umrahCount = packages.filter((p) => p.type === "umrah").length;
  const featuredCount = packages.filter((p) => p.featured).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          {t("dashboard.packages.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("dashboard.packages.subtitle")}
        </p>
      </div>

      {/* Quick stats row */}
      {!isLoading && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTypeFilter("all")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${typeFilter === "all" ? "bg-foreground text-background" : "bg-muted/60 text-foreground hover:bg-muted"}`}
          >
            <Package className="h-3 w-3" />
            All ({packages.length})
          </button>
          <button
            onClick={() => setTypeFilter("hajj")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${typeFilter === "hajj" ? "bg-emerald-600 text-white" : "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20"}`}
          >
            Hajj ({hajjCount})
          </button>
          <button
            onClick={() => setTypeFilter("umrah")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${typeFilter === "umrah" ? "bg-sky-600 text-white" : "bg-sky-500/10 text-sky-700 hover:bg-sky-500/20"}`}
          >
            Umrah ({umrahCount})
          </button>
          {featuredCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700">
              <Flame className="h-3 w-3" />
              {featuredCount} featured
            </span>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search packages by name or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/60 bg-background/50">
          <CardContent className="py-14 text-center flex flex-col items-center">
            <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center mb-3">
              <Filter className="h-7 w-7 text-primary/40" />
            </div>
            <p className="font-medium text-foreground">No packages found</p>
            <p className="text-xs text-muted-foreground mt-1">Try clearing the search or changing the filter</p>
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => { setSearch(""); setTypeFilter("all"); }}>
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((pkg) => {
            const cat = categoryConfig[pkg.category] || categoryConfig.standard;
            const typeC = typeConfig[pkg.type] || typeConfig.umrah;
            const filledSpots = pkg.capacity - pkg.available;
            const fillPct = Math.min(100, (filledSpots / pkg.capacity) * 100);
            const almostFull = pkg.available <= 20;
            const CatIcon = cat.icon;

            return (
              <Card key={pkg.id} className={`border-border/60 bg-background/50 backdrop-blur-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 overflow-hidden ${pkg.featured ? "ring-1 ring-secondary/40" : ""}`}>
                {pkg.featured && (
                  <div className="bg-gradient-to-r from-secondary/90 to-amber-500/80 px-4 py-1.5 flex items-center gap-1.5">
                    <Flame className="h-3.5 w-3.5 text-white" />
                    <span className="text-xs font-semibold text-white tracking-wide">FEATURED</span>
                  </div>
                )}
                <CardContent className="p-5">
                  {/* Badges */}
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className={`${cat.badge} text-[11px] font-bold gap-1`}>
                      <CatIcon className="h-2.5 w-2.5" />
                      {cat.label}
                    </Badge>
                    <Badge variant="outline" className={`text-[11px] border ${typeC.className}`}>
                      {pkg.type === "hajj" ? t("packages.hajj") : t("packages.umrah")}
                    </Badge>
                    {pkg.year && (
                      <Badge variant="outline" className="text-[11px] ml-auto text-muted-foreground">
                        {pkg.year}
                      </Badge>
                    )}
                  </div>

                  {/* Name & Price */}
                  <h3 className="font-heading text-base font-bold text-foreground mb-1 leading-snug">{pkg.name}</h3>
                  <p className="text-2xl font-heading font-bold text-secondary mb-3">
                    {formatPrice(Number(pkg.price))}
                    <span className="text-xs font-normal text-muted-foreground ml-1">/ person</span>
                  </p>

                  {/* Details */}
                  <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
                    {pkg.duration && (
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-secondary shrink-0" />
                        <span>{pkg.duration}</span>
                      </div>
                    )}
                    {pkg.airlines?.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Plane className="h-3.5 w-3.5 text-secondary shrink-0" />
                        <span>{pkg.airlines.join(" / ")}</span>
                      </div>
                    )}
                    {pkg.departure_cities?.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-secondary shrink-0" />
                        <span>{pkg.departure_cities.join(", ")}</span>
                      </div>
                    )}
                  </div>

                  {/* Capacity bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {filledSpots}/{pkg.capacity} booked
                      </span>
                      {almostFull ? (
                        <span className="text-destructive font-semibold">Only {pkg.available} left!</span>
                      ) : (
                        <span className="text-emerald-600">{pkg.available} spots free</span>
                      )}
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${fillPct >= 90 ? "bg-destructive" : fillPct >= 70 ? "bg-amber-500" : "bg-primary"}`}
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  </div>

                  <Link to={`/dashboard/book/${pkg.id}`}>
                    <Button
                      className="w-full gold-gradient text-secondary-foreground font-semibold"
                      disabled={pkg.available <= 0}
                    >
                      {pkg.available > 0 ? t("packages.bookNow") : "Sold Out"}
                    </Button>
                  </Link>
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
