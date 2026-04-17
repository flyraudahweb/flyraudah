import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, CheckCircle2, Circle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AuthLayout from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().min(5, "Phone number is required").regex(/^\+234\d{10}$/, "Enter a valid Nigerian phone number (+234XXXXXXXXXX)"),
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

type FormValues = z.infer<typeof schema>;

const Register = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", email: "", phone: "+234", password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    const { error } = await signUp(values.email, values.password, values.fullName, values.phone);
    setSubmitting(false);

    if (error) {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account before logging in.",
      });
      navigate("/login");
    }
  };

  return (
    <AuthLayout title="Create Your Account" subtitle="Join thousands of pilgrims who trust Raudah">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField control={form.control} name="fullName" render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="flex items-center bg-[#f8fafc] rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-[#2BB673]/50 transition-all border border-transparent hover:border-gray-200">
                  <div className="bg-white p-2.5 rounded-xl mr-2 shadow-sm shrink-0 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#2BB673]">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </div>
                  <Input placeholder="Enter your full name" className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-gray-800 placeholder:text-gray-400 font-medium h-12 px-2 text-base" required {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

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
                  <Input type="email" placeholder="you@example.com" className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-gray-800 placeholder:text-gray-400 font-medium h-12 px-2 text-base" required {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="flex items-center bg-[#f8fafc] rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-[#2BB673]/50 transition-all border border-transparent hover:border-gray-200">
                  <div className="bg-white p-2.5 rounded-xl mr-2 shadow-sm shrink-0 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#2BB673]">
                      <rect width="14" height="20" x="5" y="2" rx="2" ry="2"></rect>
                      <path d="M12 18h.01"></path>
                    </svg>
                  </div>
                  <Input placeholder="+234XXXXXXXXXX" className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-gray-800 placeholder:text-gray-400 font-medium h-12 px-2 text-base" required {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="password" render={({ field }) => {
            const pw = field.value || "";
            const checks = [
              { label: "At least 8 characters", met: pw.length >= 8 },
              { label: "Uppercase letter", met: /[A-Z]/.test(pw) },
              { label: "Number", met: /[0-9]/.test(pw) },
              { label: "Special character", met: /[^A-Za-z0-9]/.test(pw) },
            ];
            const score = checks.filter((c) => c.met).length;
            const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-lime-500", "bg-green-500"];
            const labels = ["", "Weak", "Fair", "Good", "Strong"];
            return (
              <FormItem>
                <FormControl>
                  <div className="flex items-center bg-[#f8fafc] rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-[#2BB673]/50 transition-all border border-transparent hover:border-gray-200 relative">
                    <div className="bg-white p-2.5 rounded-xl mr-2 shadow-sm shrink-0 flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#2BB673]">
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                    </div>
                    <Input type={showPassword ? "text" : "password"} placeholder="Create a password" className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-gray-800 placeholder:text-gray-400 font-medium h-12 px-2 text-base pr-12" required {...field} />
                    <button type="button" className="absolute right-4 text-gray-500 hover:text-gray-700 transition-colors" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </FormControl>
                {pw.length > 0 && (
                  <div className="space-y-2 mt-3 px-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden flex gap-0.5">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={`flex-1 rounded-full transition-all duration-300 ${i < score ? colors[score] : "bg-gray-200"}`}
                          />
                        ))}
                      </div>
                      <span className={`text-xs font-medium ${score <= 1 ? "text-red-500" : score <= 2 ? "text-yellow-500" : score <= 3 ? "text-lime-600" : "text-green-600"}`}>
                        {labels[score]}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      {checks.map((c) => (
                        <div key={c.label} className="flex items-center gap-1.5 text-xs font-medium">
                          {c.met
                            ? <CheckCircle2 className="h-4 w-4 text-[#2BB673]" />
                            : <Circle className="h-4 w-4 text-gray-300" />}
                          <span className={c.met ? "text-[#2BB673]" : "text-gray-400"}>{c.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <FormMessage />
              </FormItem>
            );
          }} />

          <FormField control={form.control} name="confirmPassword" render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="flex items-center bg-[#f8fafc] rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-[#2BB673]/50 transition-all border border-transparent hover:border-gray-200">
                  <div className="bg-white p-2.5 rounded-xl mr-2 shadow-sm shrink-0 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#2BB673]">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                      <path d="m9 12 2 2 4-4"></path>
                    </svg>
                  </div>
                  <Input type="password" placeholder="Confirm your password" className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-gray-800 placeholder:text-gray-400 font-medium h-12 px-2 text-base" required {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <Button type="submit" disabled={submitting} className="w-full bg-[#2BB673] hover:bg-[#22975f] text-white font-bold h-14 rounded-xl shadow-[0_4px_14px_0_rgba(43,182,115,0.39)] transition-all transform hover:-translate-y-0.5 mt-4">
            {submitting ? "Creating Account..." : "Create Account"}
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-gray-500 mt-8 font-medium">
        Already have an account?{" "}
        <Link to="/login" className="text-[#2BB673] font-bold hover:underline">Login</Link>
      </p>
    </AuthLayout>
  );
};

export default Register;
