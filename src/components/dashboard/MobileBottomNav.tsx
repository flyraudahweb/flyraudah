import { useTranslation } from "react-i18next";
import { NavLink } from "@/components/NavLink";
import { LayoutDashboard, Package, CalendarCheck, User } from "lucide-react";

const navItems = [
  { titleKey: "dashboard.mobile.home", url: "/dashboard", icon: LayoutDashboard },
  { titleKey: "dashboard.mobile.packages", url: "/dashboard/packages", icon: Package },
  { titleKey: "dashboard.mobile.bookings", url: "/dashboard/bookings", icon: CalendarCheck },
  { titleKey: "dashboard.mobile.profile", url: "/dashboard/profile", icon: User },
];

const MobileBottomNav = () => {
  const { t } = useTranslation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === "/dashboard"}
            className="flex flex-col items-center gap-1 px-3 py-2 text-muted-foreground transition-colors min-w-[64px]"
            activeClassName="text-secondary"
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{t(item.titleKey)}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
