import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Eye,
    CreditCard,
    ShoppingCart,
    CheckCircle,
    XCircle,
    Mail,
    Clock,
    Phone,
    Activity,
    TrendingUp,
    AlertTriangle,
    User,
    Search,
    Filter,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

const eventConfig: Record<string, { icon: any; color: string; bgColor: string; label: string }> = {
    package_view: {
        icon: Eye,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        label: "Viewed Package",
    },
    booking_start: {
        icon: ShoppingCart,
        color: "text-amber-600",
        bgColor: "bg-amber-100",
        label: "Started Booking",
    },
    payment_attempt: {
        icon: CreditCard,
        color: "text-purple-600",
        bgColor: "bg-purple-100",
        label: "Payment Attempt",
    },
    payment_success: {
        icon: CheckCircle,
        color: "text-emerald-600",
        bgColor: "bg-emerald-100",
        label: "Payment Success",
    },
    payment_failed: {
        icon: XCircle,
        color: "text-red-600",
        bgColor: "bg-red-100",
        label: "Payment Failed",
    },
};

const fallbackConfig = {
    icon: Clock,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    label: "Activity",
};

const AdminActivity = () => {
    const [search, setSearch] = useState("");
    const [eventFilter, setEventFilter] = useState<string>("all");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    // Fetch agents for identification
    const { data: agents = [] } = useQuery({
        queryKey: ["admin-agents-list"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("agents")
                .select("user_id, business_name")
                .order("business_name");
            if (error) throw error;
            return data;
        },
    });

    // Fetch ALL activity — users + agents
    const { data: activities = [], isLoading } = useQuery({
        queryKey: ["admin-activity", eventFilter],
        queryFn: async () => {
            let query = supabase
                .from("user_activity" as any)
                .select(`
                    *,
                    profiles:user_id(full_name, phone, email)
                `);

            if (eventFilter !== "all") {
                query = query.eq("event_type", eventFilter);
            }

            const { data, error } = await query.order("created_at", { ascending: false }).limit(200);
            if (error) throw error;
            return data;
        },
    });

    // Build agent lookup
    const agentMap = new Map(agents.map((a) => [a.user_id, a.business_name]));

    // Filter by search
    const filtered = (activities as any[]).filter((act) => {
        if (!search) return true;
        const q = search.toLowerCase();
        const userName = (act.profiles?.full_name || "").toLowerCase();
        const packageName = (act.packages?.name || "").toLowerCase();
        const agentName = (agentMap.get(act.user_id) || "").toLowerCase();
        const userEmail = (act.profiles?.email || "").toLowerCase();
        return userName.includes(q) || packageName.includes(q) || agentName.includes(q) || userEmail.includes(q);
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginated = filtered.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Stats
    const stats = {
        total: activities.length,
        views: activities.filter((a: any) => a.event_type === "package_view").length,
        payments: activities.filter((a: any) => a.event_type === "payment_success").length,
        failures: activities.filter((a: any) => a.event_type === "payment_failed").length,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="font-heading text-2xl font-bold text-foreground">Activity Tracking</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Monitor all user and agent interactions — identify issues and reach out to help
                </p>
            </div>

            {/* Stats Banner */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: "Total Events", value: stats.total, icon: Activity, color: "text-foreground" },
                    { label: "Package Views", value: stats.views, icon: Eye, color: "text-blue-600" },
                    { label: "Successful Payments", value: stats.payments, icon: TrendingUp, color: "text-emerald-600" },
                    { label: "Failed Payments", value: stats.failures, icon: AlertTriangle, color: "text-red-500" },
                ].map((s) => (
                    <Card key={s.label} className="bg-card border-border">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-muted/50`}>
                                    <s.icon className={`h-5 w-5 ${s.color}`} />
                                </div>
                                <div>
                                    <p className="text-xl font-bold text-foreground">{s.value}</p>
                                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by user, package, or agent..."
                        className="pl-10"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    />
                </div>
                <Select value={eventFilter} onValueChange={(v) => { setEventFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger className="w-full sm:w-[200px] bg-card">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="All Events" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Events</SelectItem>
                        <SelectItem value="package_view">Package Views</SelectItem>
                        <SelectItem value="booking_start">Booking Started</SelectItem>
                        <SelectItem value="payment_attempt">Payment Attempts</SelectItem>
                        <SelectItem value="payment_success">Successful Payments</SelectItem>
                        <SelectItem value="payment_failed">Failed Payments</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Activity Timeline */}
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-20 bg-muted/30 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <Card>
                    <CardContent className="py-16 text-center">
                        <Activity className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground font-medium">No activity found</p>
                        <p className="text-sm text-muted-foreground/60 mt-1">Try adjusting your filters</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {paginated.map((act: any) => {
                        const config = eventConfig[act.event_type] || fallbackConfig;
                        const Icon = config.icon;
                        const agentName = agentMap.get(act.user_id);
                        const isFailed = act.event_type === "payment_failed";
                        const userName = act.profiles?.full_name || "Guest User";
                        const userPhone = act.profiles?.phone;

                        return (
                            <Card
                                key={act.id}
                                className={`border transition-all hover:shadow-md ${isFailed ? "border-red-200 bg-red-50/30" : "border-border"}`}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                        {/* Event icon */}
                                        <div className={`p-2 rounded-lg shrink-0 ${config.bgColor}`}>
                                            <Icon className={`h-4 w-4 ${config.color}`} />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                                <span className="font-semibold text-sm text-foreground truncate">
                                                    {userName}
                                                </span>
                                                <span className="text-muted-foreground text-xs hidden sm:inline">•</span>
                                                <Badge variant="outline" className={`text-[10px] w-fit ${config.color} border-current/20`}>
                                                    {config.label}
                                                </Badge>
                                                {agentName && (
                                                    <Badge variant="outline" className="text-[10px] w-fit border-secondary/30 text-secondary bg-secondary/5">
                                                        Agent: {agentName}
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Contact Info (Visible for all events now) */}
                                            <div className="flex flex-wrap items-center gap-3">
                                                {userPhone && (
                                                    <a
                                                        href={`tel:${userPhone}`}
                                                        className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline"
                                                    >
                                                        <Phone className="h-2.5 w-2.5" />
                                                        {userPhone}
                                                    </a>
                                                )}
                                                {act.profiles?.email && (
                                                    <a
                                                        href={`mailto:${act.profiles.email}`}
                                                        className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline"
                                                    >
                                                        <Mail className="h-2.5 w-2.5" />
                                                        {act.profiles.email}
                                                    </a>
                                                )}
                                            </div>

                                            {/* Details row */}
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                {act.packages?.name && (
                                                    <span>📦 {act.packages.name}</span>
                                                )}
                                                {act.metadata?.method && (
                                                    <span>💳 {act.metadata.method}</span>
                                                )}
                                                {act.metadata?.amount && (
                                                    <span className="font-medium text-foreground">
                                                        ₦{Number(act.metadata.amount).toLocaleString()}
                                                    </span>
                                                )}
                                                {act.metadata?.error && (
                                                    <span className="text-red-500 font-medium truncate max-w-[250px]">
                                                        ⚠️ {act.metadata.error}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Contact info — shown for failed payments */}
                                            {isFailed && (
                                                <div className="flex flex-wrap items-center gap-2 pt-1 mt-1 border-t border-red-200/50">
                                                    <span className="text-[10px] font-semibold text-red-600 uppercase tracking-wider">
                                                        Support Alert
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Timestamp */}
                                        <div className="text-right shrink-0">
                                            <p className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(act.created_at), { addSuffix: true })}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground/60">
                                                {format(new Date(act.created_at), "MMM d, HH:mm")}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {
                totalPages > 1 && (
                    <div className="flex justify-center mt-6">
                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                    />
                                </PaginationItem>

                                {[...Array(totalPages)].map((_, i) => (
                                    <PaginationItem key={i + 1}>
                                        <PaginationLink
                                            onClick={() => setCurrentPage(i + 1)}
                                            isActive={currentPage === i + 1}
                                            className="cursor-pointer"
                                        >
                                            {i + 1}
                                        </PaginationLink>
                                    </PaginationItem>
                                ))}

                                <PaginationItem>
                                    <PaginationNext
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                )
            }
        </div >
    );
};

export default AdminActivity;
