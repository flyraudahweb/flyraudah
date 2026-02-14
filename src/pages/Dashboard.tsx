import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

const Dashboard = () => {
  const { user, profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <img
              src="https://i.ibb.co/C3zkfpVR/Rauda-Logo-2-PNG.png"
              alt="Raudah Travels"
              className="h-8 w-auto"
            />
            <span className="font-heading text-lg font-semibold text-foreground">Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{profile?.full_name || user?.email}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-1" /> Sign Out
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-6 py-12">
        <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
          Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}! 👋
        </h1>
        <p className="text-muted-foreground mb-8">Your dashboard is being built. Stay tuned for booking management, packages, and more.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "Active Bookings", value: "0" },
            { label: "Payments Made", value: "₦0" },
            { label: "Documents", value: "0" },
          ].map((stat) => (
            <div key={stat.label} className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-heading font-bold text-foreground mt-1">{stat.value}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
