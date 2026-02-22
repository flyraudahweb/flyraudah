import { NavLink } from "@/components/NavLink";
import { LayoutDashboard, Users, Package, PiggyBank, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
    { title: "Home", url: "/agent", icon: LayoutDashboard },
    { title: "Clients", url: "/agent/clients", icon: Users },
    { title: "Packages", url: "/agent/packages", icon: Package },
    { title: "Earnings", url: "/agent/commissions", icon: PiggyBank },
];

const AgentMobileBottomNav = () => {
    const { signOut } = useAuth();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden">
            <div className="flex items-center justify-around h-16">
                {navItems.map((item) => (
                    <NavLink
                        key={item.url}
                        to={item.url}
                        end={item.url === "/agent"}
                        className="flex flex-col items-center gap-1 px-3 py-2 text-muted-foreground transition-colors min-w-[54px]"
                        activeClassName="text-secondary"
                    >
                        <item.icon className="h-5 w-5" />
                        <span className="text-[9px] font-medium">{item.title}</span>
                    </NavLink>
                ))}
                {/* Logout */}
                <button
                    onClick={() => signOut()}
                    className="flex flex-col items-center gap-1 px-3 py-2 text-destructive/70 hover:text-destructive transition-colors min-w-[54px]"
                >
                    <LogOut className="h-5 w-5" />
                    <span className="text-[9px] font-medium">Logout</span>
                </button>
            </div>
        </nav>
    );
};

export default AgentMobileBottomNav;
