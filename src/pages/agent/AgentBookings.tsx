import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Package, Search, CheckCircle2, Clock, XCircle, Users,
  MapPin, CalendarDays, TrendingUp, Filter, Download, Loader2
} from "lucide-react";
import { formatPrice } from "@/data/packages";
import { format } from "date-fns";
import { toast } from "sonner";
import { downloadMultipleDocuments } from "@/utils/documentExport";


const statusConfig: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  confirmed: { label: "Confirmed", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle2 },
  pending: { label: "Pending", className: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Clock },
  cancelled: { label: "Cancelled", className: "bg-red-500/10 text-red-600 border-red-500/20", icon: XCircle },
  completed: { label: "Completed", className: "bg-primary/10 text-primary border-primary/20", icon: CheckCircle2 },
};

const AgentBookings = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const { user } = useAuth();

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["agent-bookings-full", user?.id],
    queryFn: async () => {
      const { data: agentData } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (!agentData) return [];

      const { data, error } = await supabase
        .from("bookings")
        .select("id, full_name, reference, status, created_at, departure_city, packages(name, price), payments(status)")
        .eq("agent_id", agentData.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((b) => {
        const item = b as any;
        return {
          ...item,
          package_name: item.packages?.name || "—",
          price: item.packages?.price || 0,
        };
      });
    },
    enabled: !!user,
  });

  const filtered = bookings.filter((b) => {
    const matchSearch =
      !search ||
      b.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (b.reference || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || b.status === statusFilter;

    const payments = (b as any).payments || [];
    const isVerified = payments.some((p: any) => p.status === "verified");
    const isPending = payments.some((p: any) => p.status === "pending") && !isVerified;

    let matchPayment = true;
    if (paymentFilter === "verified") matchPayment = isVerified;
    if (paymentFilter === "pending") matchPayment = isPending || payments.length === 0;

    return matchSearch && matchStatus && matchPayment;
  });

  const toggleSelectAll = () => {
    if (filtered.length > 0 && filtered.every((b) => selectedIds.has(b.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((b) => b.id)));
    }
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDownload = async () => {
    setIsDownloading(true);
    try {
      const bookingIds = selectedIds.size > 0
        ? Array.from(selectedIds)
        : filtered.map(b => b.id);

      const { data: docs, error } = await supabase
        .from("documents")
        .select("*, bookings:booking_id(full_name)")
        .in("booking_id", bookingIds);

      if (error) throw error;

      if (!docs || docs.length === 0) {
        toast.error("No documents found for selected pilgrims.");
        return;
      }

      const downloadList = docs.map((d: any) => ({
        url: d.file_url,
        fileName: d.file_name,
        type: d.type,
        pilgrimName: d.bookings?.full_name || "Unknown",
      }));

      toast.info(`Preparing ${downloadList.length} documents for download...`);
      await downloadMultipleDocuments(downloadList, `client_documents_${format(new Date(), "yyyyMMdd")}.zip`);
      toast.success(`Downloaded ${downloadList.length} documents successfully.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to download documents");
    } finally {
      setIsDownloading(false);
    }
  };

  // Aggregates
  const totalRevenue = bookings.filter((b) => b.status === "confirmed" || b.status === "completed").reduce((sum, b) => sum + Number(b.price), 0);
  const confirmed = bookings.filter((b) => b.status === "confirmed").length;
  const pending = bookings.filter((b) => b.status === "pending").length;

  const statuses = ["all", "confirmed", "pending", "cancelled", "completed"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Client Bookings</h1>
        <p className="text-sm text-muted-foreground mt-1">Track and manage all bookings made through your agency</p>
      </div>

      {/* Summary pills */}
      {!isLoading && bookings.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: bookings.length, color: "text-foreground", bg: "bg-muted/60" },
            { label: "Confirmed", value: confirmed, color: "text-emerald-600", bg: "bg-emerald-500/10" },
            { label: "Pending", value: pending, color: "text-amber-600", bg: "bg-amber-500/10" },
            { label: "Revenue", value: formatPrice(totalRevenue), color: "text-primary", bg: "bg-primary/10" },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl ${s.bg} px-3 py-2.5`}>
              <p className={`text-base font-heading font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pilgrim name or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {statuses.map((s) => {
            const sc = s !== "all" ? statusConfig[s] : null;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-foreground hover:bg-muted"
                  }`}
              >
                {s === "all" ? "All" : sc?.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/60 bg-background/50">
          <CardContent className="py-14 text-center flex flex-col items-center">
            <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center mb-3">
              <Filter className="h-7 w-7 text-primary/40" />
            </div>
            <p className="font-medium text-sm">
              {bookings.length === 0 ? "No bookings yet" : "No bookings match your search"}
            </p>
            {bookings.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">Book a package for one of your clients to see it here</p>
            )}
            {bookings.length > 0 && (
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setSearch(""); setStatusFilter("all"); }}>
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-muted/30 border border-border/60 rounded-xl">
            <Checkbox
              checked={filtered.length > 0 && filtered.every((b) => selectedIds.has(b.id))}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-sm font-medium">Select All</span>

            {(selectedIds.size > 0 || filtered.length > 0) && (
              <Button size="sm" variant="default" onClick={handleBulkDownload} disabled={isDownloading} className="ml-auto gap-2">
                {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download Docs {selectedIds.size > 0 && `(${selectedIds.size})`}
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {filtered.map((b) => {
              const sc = statusConfig[b.status] || statusConfig.pending;
              const isChecked = selectedIds.has(b.id);
              return (
                <Card
                  key={b.id}
                  className={`border-border/60 bg-background/50 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 cursor-pointer ${isChecked ? "ring-2 ring-primary ring-inset bg-primary/5 border-primary/20" : ""}`}
                  onClick={() => toggleRow(b.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleRow(b.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mr-1"
                      />
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${sc.className.split(" ").slice(0, 2).join(" ")}`}>
                        <sc.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">{b.full_name}</p>
                          <Badge variant="outline" className={`text-[10px] px-2 py-0 border ${sc.className}`}>{sc.label}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          <span className="font-mono">{b.reference || b.id.slice(0, 8).toUpperCase()}</span>
                          {b.package_name !== "—" && (
                            <span className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {b.package_name}
                            </span>
                          )}
                          {b.departure_city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {b.departure_city}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {b.price > 0 && (
                          <p className="text-sm font-semibold text-foreground">{formatPrice(b.price)}</p>
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(b.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentBookings;
