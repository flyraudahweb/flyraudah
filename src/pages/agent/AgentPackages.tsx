import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Star, Percent } from "lucide-react";

const AgentPackages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch agent's commission rate
  const { data: agent } = useQuery({
    queryKey: ["agent-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("agents")
        .select("commission_rate")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Fetch active packages with wholesale pricing
  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["agent-packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const getWholesalePrice = (price: number, agentDiscount: number) => {
    const discount = agent?.commission_rate || agentDiscount;
    return price - (price * discount / 100);
  };

  const categoryColors: Record<string, string> = {
    premium: "bg-chart-4/10 text-chart-4",
    standard: "bg-primary/10 text-primary",
    budget: "bg-chart-2/10 text-chart-2",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Wholesale Packages</h1>
        <p className="text-muted-foreground mt-1">
          Browse packages at wholesale pricing
          {agent && <span className="ml-1 text-primary font-medium">({agent.commission_rate}% discount)</span>}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map((pkg) => {
            const wholesalePrice = getWholesalePrice(pkg.price, pkg.agent_discount);
            const savings = pkg.price - wholesalePrice;

            return (
              <Card key={pkg.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{pkg.name}</CardTitle>
                      <CardDescription>{pkg.type.toUpperCase()} • {pkg.duration}</CardDescription>
                    </div>
                    <Badge className={categoryColors[pkg.category] || "bg-muted text-muted-foreground"}>
                      {pkg.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-primary">
                        ₦{wholesalePrice.toLocaleString()}
                      </span>
                      <span className="text-sm text-muted-foreground line-through">
                        ₦{pkg.price.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-chart-2">
                      <Percent className="h-3 w-3" />
                      You save ₦{savings.toLocaleString()} per booking
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2">
                      <Package className="h-3.5 w-3.5" />
                      <span>{pkg.available} / {pkg.capacity} slots available</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="h-3.5 w-3.5" />
                      <span>{pkg.year} Season</span>
                    </div>
                  </div>

                  {pkg.inclusions && pkg.inclusions.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {pkg.inclusions.slice(0, 3).map((inc, idx) => (
                        <span key={idx} className="text-xs bg-muted px-2 py-0.5 rounded">{inc}</span>
                      ))}
                      {pkg.inclusions.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{pkg.inclusions.length - 3} more</span>
                      )}
                    </div>
                  )}

                  <Button
                    className="w-full mt-auto"
                    disabled={pkg.available <= 0}
                    onClick={() => navigate(`/agent/book/${pkg.id}`)}
                  >
                    {pkg.available > 0 ? "Book for Client" : "Sold Out"}
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
