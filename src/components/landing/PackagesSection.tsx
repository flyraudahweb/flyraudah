import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import PackageCard from "@/components/packages/PackageCard";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

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
    <section id="packages" className="py-24 bg-white relative overflow-hidden">
      {/* Subtle decorative blobs */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#2BB673]/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#4CD964]/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 sm:px-10 lg:px-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-sm font-bold tracking-widest uppercase text-[#2BB673] mb-3">
            Our Packages
          </span>
          <h2 className="font-heading text-4xl md:text-5xl font-black text-gray-900">
            {t("packages.title")}
          </h2>
          <div className="mt-4 mb-4 flex items-center justify-center gap-3">
            <div className="h-0.5 w-12 bg-gradient-to-r from-transparent to-[#2BB673] rounded-full" />
            <div className="w-2 h-2 bg-[#2BB673] rounded-full" />
            <div className="h-0.5 w-12 bg-gradient-to-l from-transparent to-[#2BB673] rounded-full" />
          </div>
          <p className="text-gray-500 max-w-xl mx-auto tracking-wide text-lg">
            {t("packages.subtitle")}
          </p>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-96 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {packages.map((pkg: any, i: number) => (
              <PackageCard key={pkg.id} pkg={pkg} index={i} />
            ))}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-14"
        >
          <Link to="/packages">
            <Button
              size="lg"
              className="primary-gradient text-white shadow-gold hover:shadow-gold-lg hover:-translate-y-1 transition-all text-lg font-bold px-12 py-7 rounded-full"
            >
              {t("packages.viewAll") || "View All Packages"}
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default PackagesSection;
