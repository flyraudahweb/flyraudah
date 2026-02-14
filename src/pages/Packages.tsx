import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { X, SlidersHorizontal, Home, ChevronRight, PackageOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/data/packages";
import PackageCard from "@/components/packages/PackageCard";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const MIN_PRICE = 3000000;
const MAX_PRICE = 8000000;

const MONTH_MAP: Record<string, string> = {
  feb: "2026-02",
  mar: "2026-03",
  jun: "2026-06",
  jul: "2026-07",
};

const Packages = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [priceRange, setPriceRange] = useState<number[]>([MIN_PRICE, MAX_PRICE]);
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedType, setSelectedType] = useState<"all" | "hajj" | "umrah">("all");
  const [selectedCategory, setSelectedCategory] = useState<"all" | "premium" | "standard" | "budget">("all");

  useEffect(() => {
    const typeParam = searchParams.get("type");
    if (typeParam === "hajj" || typeParam === "umrah") {
      setSelectedType(typeParam);
    }
    const monthParam = searchParams.get("month");
    if (monthParam && MONTH_MAP[monthParam]) {
      setSelectedMonth(MONTH_MAP[monthParam]);
    }
  }, [searchParams]);

  const { data: activePackages = [], isLoading } = useQuery({
    queryKey: ["active-packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("*, package_accommodations(*), package_dates(*)")
        .eq("status", "active")
        .order("featured", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Derive month options from data
  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    activePackages.forEach((pkg: any) => {
      pkg.package_dates?.forEach((d: any) => {
        const date = parseISO(d.outbound);
        months.add(format(date, "yyyy-MM"));
      });
    });
    return Array.from(months)
      .sort()
      .map((m) => ({
        value: m,
        label: format(parseISO(`${m}-01`), "MMMM yyyy"),
      }));
  }, [activePackages]);

  // Derive city options from data
  const cityOptions = useMemo(() => {
    const cities = new Set<string>();
    activePackages.forEach((pkg: any) => pkg.departure_cities?.forEach((c: string) => cities.add(c)));
    return Array.from(cities).sort();
  }, [activePackages]);

  // Filter
  const filtered = useMemo(() => {
    return activePackages.filter((pkg: any) => {
      if (Number(pkg.price) < priceRange[0] || Number(pkg.price) > priceRange[1]) return false;
      if (selectedType !== "all" && pkg.type !== selectedType) return false;
      if (selectedCategory !== "all" && pkg.category !== selectedCategory) return false;
      if (selectedMonth !== "all") {
        const hasMonth = pkg.package_dates?.some((d: any) => {
          const m = format(parseISO(d.outbound), "yyyy-MM");
          return m === selectedMonth;
        });
        if (!hasMonth) return false;
      }
      if (selectedCity !== "all") {
        if (!pkg.departure_cities?.includes(selectedCity)) return false;
      }
      return true;
    });
  }, [activePackages, priceRange, selectedMonth, selectedCity, selectedType, selectedCategory]);

  const hasActiveFilters =
    priceRange[0] !== MIN_PRICE ||
    priceRange[1] !== MAX_PRICE ||
    selectedMonth !== "all" ||
    selectedCity !== "all" ||
    selectedType !== "all" ||
    selectedCategory !== "all";

  const clearFilters = () => {
    setPriceRange([MIN_PRICE, MAX_PRICE]);
    setSelectedMonth("all");
    setSelectedCity("all");
    setSelectedType("all");
    setSelectedCategory("all");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <Header />

      {/* Compact Hero */}
      <section className="relative pt-24 pb-12 emerald-gradient geometric-overlay">
        <div className="container mx-auto px-4 sm:px-8 lg:px-12 relative z-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-primary-foreground/70 mb-4">
            <Link to="/" className="hover:text-primary-foreground transition-colors flex items-center gap-1">
              <Home className="h-3.5 w-3.5" /> Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-primary-foreground font-medium">Packages</span>
          </nav>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-primary-foreground">
            All Packages
          </h1>
          <div className="ornament-divider mt-3 mb-0 [&::before]:bg-gradient-to-r [&::before]:from-transparent [&::before]:via-primary-foreground/50 [&::before]:to-transparent [&::after]:bg-gradient-to-r [&::after]:from-transparent [&::after]:via-primary-foreground/50 [&::after]:to-transparent">
            <div className="diamond !bg-primary-foreground/60" />
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="container mx-auto px-4 sm:px-8 lg:px-12 -mt-6 relative z-20">
        <div className="bg-card border border-border rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-2 mb-5">
            <SlidersHorizontal className="h-4 w-4 text-secondary" />
            <span className="text-sm font-semibold text-foreground uppercase tracking-wider">Filters</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Package Type */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 block">
                Package Type
              </label>
              <div className="flex gap-2">
                {["all", "hajj", "umrah"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type as any)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selectedType === type
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {type === "all" ? "All Types" : type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 block">
                Category
              </label>
              <div className="flex gap-2 flex-wrap">
                {["all", "premium", "standard", "budget"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat as any)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                      selectedCategory === cat
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 block">
                Price Range
              </label>
              <Slider
                value={priceRange}
                min={MIN_PRICE}
                max={MAX_PRICE}
                step={500000}
                onValueChange={setPriceRange}
                className="mb-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatPrice(priceRange[0])}</span>
                <span>{formatPrice(priceRange[1])}</span>
              </div>
            </div>

            {/* Travel Date */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 block">
                Travel Date
              </label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="All Dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  {monthOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Departure City */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 block">
                Departure City
              </label>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger>
                  <SelectValue placeholder="All Cities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {cityOptions.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-border">
              {selectedType !== "all" && (
                <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setSelectedType("all")}>
                  {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}
                  <X className="h-3 w-3" />
                </Badge>
              )}
              {selectedCategory !== "all" && (
                <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setSelectedCategory("all")}>
                  {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
                  <X className="h-3 w-3" />
                </Badge>
              )}
              {(priceRange[0] !== MIN_PRICE || priceRange[1] !== MAX_PRICE) && (
                <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setPriceRange([MIN_PRICE, MAX_PRICE])}>
                  {formatPrice(priceRange[0])} – {formatPrice(priceRange[1])}
                  <X className="h-3 w-3" />
                </Badge>
              )}
              {selectedMonth !== "all" && (
                <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setSelectedMonth("all")}>
                  {monthOptions.find((m) => m.value === selectedMonth)?.label}
                  <X className="h-3 w-3" />
                </Badge>
              )}
              {selectedCity !== "all" && (
                <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setSelectedCity("all")}>
                  {selectedCity}
                  <X className="h-3 w-3" />
                </Badge>
              )}
              <button onClick={clearFilters} className="text-xs text-secondary hover:underline ml-2">
                Clear all
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Results */}
      <section className="container mx-auto px-4 sm:px-8 lg:px-12 py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-96 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              Showing <span className="font-semibold text-foreground">{filtered.length}</span> of{" "}
              <span className="font-semibold text-foreground">{activePackages.length}</span> packages
            </p>

            {filtered.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filtered.map((pkg, i) => (
                  <PackageCard key={pkg.id} pkg={pkg as any} index={i} />
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20"
              >
                <PackageOpen className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
                <h3 className="font-heading text-xl font-bold text-foreground mb-2">No packages found</h3>
                <p className="text-muted-foreground mb-6">Try adjusting your filters to see more options.</p>
                <Button variant="outline" onClick={clearFilters} className="border-secondary text-secondary">
                  Clear All Filters
                </Button>
              </motion.div>
            )}
          </>
        )}
      </section>

      <Footer />
    </div>
  );
};

export default Packages;
