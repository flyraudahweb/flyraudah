import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AuthLayout from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number")
    .regex(/[^A-Za-z0-9]/, "Must contain a special character"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const ResetPassword = () => {
  const { updatePassword, hasRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Detect if this is a staff account setup from an invite link
  // (URL will contain a Supabase token hash when arriving from the invite email)
  const isStaffSetup = window.location.hash.includes("type=recovery") ||
    window.location.search.includes("type=recovery");

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    setSubmitting(true);
    const { error } = await updatePassword(values.password);
    setSubmitting(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setDone(true);
      // Redirect based on role: staff/admin → admin dashboard, others → customer dashboard
      setTimeout(() => {
        if (hasRole("staff") || hasRole("admin") || hasRole("super_admin" as any)) {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
      }, 2000);
    }
  };

  const pageTitle = done
    ? "Password Set!"
    : isStaffSetup
      ? "Welcome to the Team!"
      : "Set New Password";

  const pageSubtitle = done
    ? undefined
    : isStaffSetup
      ? "Create a secure password to access your Raudah Travels staff dashboard"
      : "Create a strong password for your account";

  const doneMessage = hasRole("staff") || hasRole("admin") || hasRole("super_admin" as any)
    ? "Your password has been set. Redirecting you to the admin dashboard..."
    : "Your password has been updated. Redirecting you to the dashboard...";

  return (
    <AuthLayout title={pageTitle} subtitle={pageSubtitle}>
      {done ? (
        <div className="text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <p className="text-muted-foreground">{doneMessage}</p>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} placeholder="Create a new password" required {...field} />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="confirmPassword" render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl><Input type="password" placeholder="Confirm your new password" required {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <Button type="submit" disabled={submitting} className="w-full gold-gradient text-secondary-foreground shadow-gold hover:shadow-gold-lg hover:-translate-y-0.5 transition-all">
              {submitting ? "Setting up..." : isStaffSetup ? "Activate My Account" : "Update Password"}
            </Button>
          </form>
        </Form>
      )}
    </AuthLayout>
  );
};

export default ResetPassword;
