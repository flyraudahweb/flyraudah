import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import PackageCard from "@/components/packages/PackageCard";
import { Skeleton } from "@/components/ui/skeleton";

const PackagesSection = () => {
  const { t } = useTranslation();

  // Fetch from Supabase so IDs match PackageDetail
  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["landing-packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("*, package_accommodations(*), package_dates(*)")
        .eq("status", "active")
        .order("featured", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <section id="packages" className="py-24 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-6 sm:px-10 lg:px-16">
        <div className="text-center mb-16">
          <h2 className="font-heading text-4xl md:text-5xl font-bold text-foreground">
            {t("packages.title")}
          </h2>
          <div className="ornament-divider mt-4 mb-4">
            <div className="diamond" />
          </div>
          <p className="text-muted-foreground max-w-xl mx-auto tracking-wide">
            {t("packages.subtitle")}
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-96 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {packages.map((pkg: any, i: number) => (
              <PackageCard key={pkg.id} pkg={pkg} index={i} />
            ))}
          </div>
        )}

        <div className="text-center mt-12">
          <Link to="/packages">
            <Button
              size="lg"
              className="gold-gradient text-secondary-foreground shadow-gold hover:shadow-gold-lg hover:-translate-y-1 transition-all text-lg font-semibold px-12 py-7"
            >
              {t("packages.viewAll") || "View All Packages"}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PackagesSection;
