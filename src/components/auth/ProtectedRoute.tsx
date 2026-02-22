import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Props {
  children: React.ReactNode;
  requiredRole?: AppRole;
  requiredPermission?: string;
}

const ProtectedRoute = ({ children, requiredRole, requiredPermission }: Props) => {
  const { user, loading, rolesLoaded, hasRole, hasPermission } = useAuth();
  const location = useLocation();

  // Wait for both auth AND roles to be resolved before making any decisions
  if (loading || (user && requiredRole && !rolesLoaded)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground font-body">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
