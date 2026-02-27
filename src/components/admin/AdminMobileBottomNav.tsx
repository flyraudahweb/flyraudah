import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import {
    LayoutDashboard,
    Package,
    CreditCard,
    Users,
    BarChart3,
    Barcode,
    UserPlus,
    Building2,
    History,
    Headset,
    LogOut,
    Pencil,
    ShieldCheck,
    Settings,
    MessageCircle,
    FormInput,
} from "lucide-react";

const ALL_NAV_ITEMS = [
    { title: "Overview", url: "/admin", icon: LayoutDashboard, permission: "overview" },
    { title: "Packages", url: "/admin/packages", icon: Package, permission: "packages" },
    { title: "Payments", url: "/admin/payments", icon: CreditCard, permission: "payments" },
    { title: "Pilgrims", url: "/admin/pilgrims", icon: Users, permission: "pilgrims" },
    { title: "Analytics", url: "/admin/analytics", icon: BarChart3, permission: "analytics" },
    { title: "ID Tags", url: "/admin/id-tags", icon: Barcode, permission: "id_tags" },
    { title: "Agents", url: "/admin/agent-applications", icon: UserPlus, permission: "agents" },
    { title: "Banks", url: "/admin/bank-accounts", icon: Building2, permission: "bank_accounts" },
    { title: "Activity", url: "/admin/activity", icon: History, permission: "activity" },
    { title: "Amendments", url: "/admin/amendments", icon: Pencil, permission: "amendments" },
    { title: "Support", url: "/admin/support", icon: Headset, permission: "support" },
    { title: "Chat", url: "/admin/chat", icon: MessageCircle, permission: "overview" },
    { title: "Visa", url: "/admin/visa-management", icon: ShieldCheck, permission: "visa_management" },
    { title: "Staff", url: "/admin/staff", icon: ShieldCheck, permission: "staff_management" },
    { title: "Book Form", url: "/admin/booking-form", icon: FormInput, permission: "settings" },
    { title: "Settings", url: "/admin/settings", icon: Settings, permission: "settings" }, // Added Settings item
];

const AdminMobileBottomNav = () => {
    const { signOut, hasPermission } = useAuth();

    const navItems = ALL_NAV_ITEMS.filter((item) => hasPermission(item.permission));

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden">
            {/* Scrollable row */}
            <div className="flex items-stretch overflow-x-auto scrollbar-none h-16">
                {navItems.map((item) => (
                    <NavLink
                        key={item.url}
                        to={item.url}
                        end={item.url === "/admin"}
                        className="flex flex-col items-center justify-center gap-1 px-4 py-2 text-muted-foreground transition-colors shrink-0 min-w-[64px]"
                        activeClassName="text-secondary"
                    >
                        <item.icon className="h-5 w-5" />
                        <span className="text-[9px] font-medium whitespace-nowrap">{item.title}</span>
                    </NavLink>
                ))}

                {/* Logout — pinned at end */}
                <button
                    onClick={() => signOut()}
                    className="flex flex-col items-center justify-center gap-1 px-4 py-2 text-destructive/70 hover:text-destructive transition-colors shrink-0 min-w-[64px]"
                >
                    <LogOut className="h-5 w-5" />
                    <span className="text-[9px] font-medium whitespace-nowrap">Logout</span>
                </button>
            </div>
        </nav>
    );
};

export default AdminMobileBottomNav;
