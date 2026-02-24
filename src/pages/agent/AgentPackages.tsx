import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package, Star, Percent, CalendarDays, MapPin, Users,
  Plane, Flame, Search, TrendingDown, CheckCircle2
} from "lucide-react";
import { formatPrice } from "@/data/packages";

const categoryConfig: Record<string, { badge: string; label: string }> = {
  premium: { badge: "bg-amber-500 text-white", label: "PREMIUM" },
  standard: { badge: "bg-primary text-primary-foreground", label: "STANDARD" },
  budget: { badge: "bg-slate-500 text-white", label: "VALUE" },
};

const AgentPackages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "hajj" | "umrah">("all");

  // Agent profile for commission rate
  const { data: agent } = useQuery({
    queryKey: ["agent-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("agents")
        .select("commission_rate, commission_type, id")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Active packages
  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["agent-packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .eq("status", "active")
        .order("featured", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const commissionRate = Number(agent?.commission_rate || 0);
  const commissionType = agent?.commission_type ?? "percentage";

  const getWholesalePrice = (price: number) => {
    if (commissionType === "fixed") {
      return Math.max(0, price - commissionRate);
    }
    return Math.max(0, price - (price * commissionRate / 100));
  };

  const filtered = packages.filter((pkg) => {
    const matchType = typeFilter === "all" || pkg.type === typeFilter;
    const matchSearch = !search || pkg.name.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const totalSavings = filtered.reduce((sum, pkg) => {
    return sum + (pkg.price - getWholesalePrice(pkg.price));
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Wholesale Packages</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse packages at your{" "}
            {commissionRate > 0 ? (
              <span className="font-semibold text-emerald-600">
                {commissionType === "fixed" ? `${formatPrice(commissionRate)}` : `${commissionRate}%`} agent discount
              </span>
            ) : (
              "exclusive agent pricing"
            )}
          </p>
        </div>
        {commissionRate > 0 && (
          <div className="shrink-0 flex flex-col items-end">
            <span className="text-[11px] text-muted-foreground">Your savings on {filtered.length} packages</span>
            <span className="text-lg font-heading font-bold text-emerald-600">−{formatPrice(totalSavings)}</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search packages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "hajj", "umrah"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${typeFilter === type
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-foreground hover:bg-muted"
                }`}
            >
              {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/60 bg-background/50">
          <CardContent className="py-14 text-center">
            <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium">No packages found</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setSearch(""); setTypeFilter("all"); }}>
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((pkg) => {
            const cat = categoryConfig[pkg.category] || categoryConfig.standard;
            const wholesalePrice = getWholesalePrice(pkg.price);
            const savings = pkg.price - wholesalePrice;
            const filledSpots = pkg.capacity - pkg.available;
            const fillPct = Math.min(100, (filledSpots / pkg.capacity) * 100);
            const soldOut = pkg.available <= 0;

            return (
              <Card
                key={pkg.id}
                className={`border-border/60 bg-background/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 overflow-hidden flex flex-col ${pkg.featured ? "ring-1 ring-secondary/40" : ""}`}
              >
                {pkg.featured && (
                  <div className="bg-gradient-to-r from-secondary/90 to-amber-500/80 px-4 py-1.5 flex items-center gap-1.5">
                    <Flame className="h-3.5 w-3.5 text-white" />
                    <span className="text-xs font-semibold text-white tracking-wide">FEATURED</span>
                  </div>
                )}
                <CardContent className="p-5 flex-1 flex flex-col">
                  {/* Category & type */}
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className={`${cat.badge} text-[11px] font-bold`}>{cat.label}</Badge>
                    <Badge variant="outline" className="text-[11px] text-muted-foreground">
                      {pkg.type.toUpperCase()}
                    </Badge>
                    {pkg.year && <Badge variant="outline" className="text-[11px] ml-auto text-muted-foreground">{pkg.year}</Badge>}
                  </div>

                  {/* Name */}
                  <h3 className="font-heading text-sm font-bold text-foreground mb-1 leading-snug">{pkg.name}</h3>
                  {pkg.duration && <p className="text-xs text-muted-foreground mb-3">{pkg.duration}</p>}

                  {/* Price block */}
                  <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3 mb-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-heading font-bold text-foreground">
                        {formatPrice(wholesalePrice)}
                      </span>
                      {commissionRate > 0 && (
                        <span className="text-xs text-muted-foreground line-through">
                          {formatPrice(pkg.price)}
                        </span>
                      )}
                    </div>
                    {commissionRate > 0 && savings > 0 && (
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-emerald-600 font-medium">
                        <TrendingDown className="h-3 w-3" />
                        You save {formatPrice(savings)} per booking
                      </div>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="space-y-1.5 text-xs text-muted-foreground mb-3 flex-1">
                    {pkg.airlines?.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Plane className="h-3 w-3 shrink-0" />
                        <span>{pkg.airlines.join(" / ")}</span>
                      </div>
                    )}
                    {pkg.departure_cities?.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span>{pkg.departure_cities.join(", ")}</span>
                      </div>
                    )}
                    {pkg.inclusions?.slice(0, 2).map((inc: string, i: number) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                        <span>{inc}</span>
                      </div>
                    ))}
                    {(pkg.inclusions?.length || 0) > 2 && (
                      <p className="text-muted-foreground/60 pl-4">+{pkg.inclusions.length - 2} more inclusions</p>
                    )}
                  </div>

                  {/* Capacity bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {pkg.available} of {pkg.capacity} available
                      </span>
                      {pkg.available <= 20 && !soldOut && (
                        <span className="text-destructive font-medium">Almost full!</span>
                      )}
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${fillPct >= 90 ? "bg-destructive" : fillPct >= 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  </div>

                  <Button
                    className="w-full gold-gradient text-secondary-foreground font-semibold mt-auto"
                    disabled={soldOut}
                    onClick={() => navigate(`/agent/book/${pkg.id}`)}
                  >
                    {soldOut ? "Sold Out" : "Book for Client"}
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

export default AgentPackages;
