import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AuthLayout from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

const Login = () => {
  const { signIn, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);

    // Do NOT manually signOut here; it causes extra auth churn.
    // signInWithPassword naturally replaces the session.

    const { error, roles } = await signIn(values.email, values.password);

    if (error) {
      setSubmitting(false);
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {

      // Captured 'roles' from result closure safely
      setTimeout(() => {
        const isAdmin = roles.includes("admin") || roles.includes("super_admin");
        const hasAgentRole = roles.includes("agent");

        // Fire login notification for admins (fire-and-forget)
        if (isAdmin) {
          supabase.functions.invoke("send-login-notification", {
            body: {
              email: values.email,
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent,
            },
          }).catch(() => {/* silent */ });
        }

        // 1. Establish the "Safe Default" based ON ROLES
        let target = "/dashboard";
        if (isAdmin) target = "/admin";
        else if (hasAgentRole) target = "/agent";

        // 2. Determine if the 'from' path is safe to use
        // We only allow 'from' if it matches the user's role capability
        if (from && from !== "/dashboard" && from !== "/login") {
          const isTargetingAdminArea = from.startsWith("/admin");
          const isTargetingAgentArea = from.startsWith("/agent");

          if (isAdmin && isTargetingAdminArea) {
            target = from; // Admin going to an admin page
          } else if (hasAgentRole && isTargetingAgentArea) {
            target = from; // Agent going to an agent page
          } else if (!isAdmin && !hasAgentRole && !isTargetingAdminArea && !isTargetingAgentArea) {
            target = from; // User going to a user page
          } else {
          }
        }

        setSubmitting(false);
        navigate(target, { replace: true });
      }, 100);
    }
  };

  return (
    <AuthLayout title="Welcome Back" subtitle="Sign in to manage your bookings">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl><Input type="email" placeholder="you@example.com" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="password" render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Password</FormLabel>
                <Link to="/forgot-password" className="text-xs text-secondary hover:underline">Forgot Password?</Link>
              </div>
              <FormControl>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} placeholder="Enter your password" {...field} />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <Button type="submit" disabled={submitting} className="w-full gold-gradient text-secondary-foreground shadow-gold hover:shadow-gold-lg hover:-translate-y-0.5 transition-all">
            {submitting ? "Signing In..." : "Sign In"}
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground mt-8">
        Don't have an account?{" "}
        <Link to="/register" className="text-secondary font-medium hover:underline">Sign Up</Link>
      </p>

    </AuthLayout>
  );
};

export default Login;
