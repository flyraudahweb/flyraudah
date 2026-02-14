import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
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
  const { signIn, loading } = useAuth();
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
    const { error, roles } = await signIn(values.email, values.password);
    setSubmitting(false);

    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      const target = from || (roles.includes("admin") ? "/admin" : roles.includes("agent") ? "/agent" : "/dashboard");
      navigate(target, { replace: true });
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

      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link to="/register" className="text-secondary font-medium hover:underline">Sign Up</Link>
      </p>

      {/* Demo Accounts */}
      <div className="border-t border-border pt-4 mt-4">
        <p className="text-xs text-muted-foreground text-center mb-3 uppercase tracking-wider font-semibold">Demo Accounts</p>
        <div className="grid grid-cols-1 gap-2">
          {[
            { label: "Admin", email: "demo-admin@raudah.com", color: "bg-primary/10 border-primary/30 text-primary" },
            { label: "Agent", email: "demo-agent@raudah.com", color: "bg-secondary/10 border-secondary/30 text-secondary" },
            { label: "User", email: "demo-user1@raudah.com", color: "bg-muted border-border text-muted-foreground" },
          ].map((demo) => (
            <button
              key={demo.email}
              type="button"
              onClick={() => {
                form.setValue("email", demo.email);
                form.setValue("password", "Demo1234!");
                form.handleSubmit(onSubmit)();
              }}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors hover:opacity-80 ${demo.color}`}
            >
              <span className="font-medium">{demo.label} Demo</span>
              <span className="text-xs opacity-70">{demo.email}</span>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">Password: Demo1234!</p>
      </div>
    </AuthLayout>
  );
};

export default Login;
