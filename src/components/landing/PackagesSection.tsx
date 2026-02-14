import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { packages } from "@/data/packages";
import PackageCard from "@/components/packages/PackageCard";

const PackagesSection = () => {
  const { t } = useTranslation();

  return (
    <section id="packages" className="py-24 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 sm:px-8 lg:px-12">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {packages
            .filter((p) => p.status === "active")
            .slice(0, 3)
            .map((pkg, i) => (
              <PackageCard key={pkg.id} pkg={pkg} index={i} />
            ))}
        </div>

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
