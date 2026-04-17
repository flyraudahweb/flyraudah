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
        const isStaffOrAdmin = roles.includes("admin") || roles.includes("super_admin") || roles.includes("staff");

        if (isStaffOrAdmin) target = "/admin";
        else if (hasAgentRole) target = "/agent";

        // 2. Determine if the 'from' path is safe to use
        // We only allow 'from' if it matches the user's role capability
        if (from && from !== "/dashboard" && from !== "/login") {
          const isTargetingAdminArea = from.startsWith("/admin");
          const isTargetingAgentArea = from.startsWith("/agent");

          if (isStaffOrAdmin && isTargetingAdminArea) {
            target = from; // Admin/Staff going to an admin page
          } else if (hasAgentRole && isTargetingAgentArea) {
            target = from; // Agent going to an agent page
          } else if (!isStaffOrAdmin && !hasAgentRole && !isTargetingAdminArea && !isTargetingAgentArea) {
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
              <FormControl>
                <div className="flex items-center bg-[#f8fafc] rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-[#2BB673]/50 transition-all border border-transparent hover:border-gray-200">
                  <div className="bg-white p-2.5 rounded-xl mr-2 shadow-sm shrink-0 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#2BB673]">
                      <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                    </svg>
                  </div>
                  <Input type="email" placeholder="you@example.com" className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-gray-800 placeholder:text-gray-400 font-medium h-12 px-2 text-base" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="password" render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="flex items-center bg-[#f8fafc] rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-[#2BB673]/50 transition-all border border-transparent hover:border-gray-200 relative">
                  <div className="bg-white p-2.5 rounded-xl mr-2 shadow-sm shrink-0 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#2BB673]">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </div>
                  <Input type={showPassword ? "text" : "password"} placeholder="At least 8 characters" className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-gray-800 placeholder:text-gray-400 font-medium h-12 px-2 text-base pr-12" {...field} />
                  <button type="button" className="absolute right-4 text-gray-500 hover:text-gray-700 transition-colors" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="flex justify-end pt-1">
            <Link to="/forgot-password" className="text-sm font-semibold text-[#2BB673] hover:underline">Forgot password?</Link>
          </div>

          <Button type="submit" disabled={submitting} className="w-full bg-[#2BB673] hover:bg-[#22975f] text-white font-bold h-14 rounded-xl shadow-[0_4px_14px_0_rgba(43,182,115,0.39)] transition-all transform hover:-translate-y-0.5">
            {submitting ? "Signing In..." : "Login"}
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-gray-500 mt-8 font-medium">
        Don't have an account?{" "}
        <Link to="/register" className="text-[#2BB673] font-bold hover:underline">Sign Up</Link>
      </p>

    </AuthLayout>
  );
};

export default Login;
