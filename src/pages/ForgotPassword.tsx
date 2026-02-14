import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AuthLayout from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
});

const ForgotPassword = () => {
  const { resetPassword } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    setSubmitting(true);
    const { error } = await resetPassword(values.email);
    setSubmitting(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
    }
  };

  return (
    <AuthLayout title={sent ? "Check Your Email" : "Reset Password"} subtitle={sent ? undefined : "Enter your email and we'll send a reset link"}>
      {sent ? (
        <div className="text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center">
            <Mail className="h-8 w-8 text-secondary" />
          </div>
          <p className="text-muted-foreground">
            We've sent a password reset link to your email. Please check your inbox and follow the instructions.
          </p>
          <Link to="/login">
            <Button variant="outline" className="border-secondary text-secondary">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Login
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" placeholder="you@example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Button type="submit" disabled={submitting} className="w-full gold-gradient text-secondary-foreground shadow-gold hover:shadow-gold-lg hover:-translate-y-0.5 transition-all">
                {submitting ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          </Form>

          <p className="text-center text-sm text-muted-foreground">
            <Link to="/login" className="text-secondary font-medium hover:underline">
              <ArrowLeft className="h-3 w-3 inline mr-1" /> Back to Login
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
};

export default ForgotPassword;
