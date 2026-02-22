import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { AlertCircle, User, Plane, CreditCard, CheckCircle } from "lucide-react";
import { useTrackActivity } from "@/hooks/useTrackActivity";
import { usePaystackEnabled } from "@/hooks/usePaystackEnabled";
import SuccessAnimation from "@/components/animations/SuccessAnimation";

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const pilgrimSchema = z.object({
  // Personal
  fullName: z.string().min(2, "Full name required (as on passport)"),
  dateOfBirth: z.string().min(1, "Date of birth required"),
  gender: z.enum(["male", "female"]),
  maritalStatus: z.enum(["single", "married", "widowed", "divorced"]),
  nationality: z.string().min(2, "Nationality required"),
  placeOfBirth: z.string().min(2, "Place of birth required"),
  occupation: z.string().min(2, "Occupation required"),
  phone: z.string().min(7, "Phone number required"),
  address: z.string().min(5, "Home address required"),
  // Parents
  fathersName: z.string().min(2, "Father's name required"),
  mothersName: z.string().min(2, "Mother's name required"),
  // Passport
  passportNumber: z.string().regex(/^[A-Z0-9]{6,9}$/, "Invalid passport number (e.g. A12345678)"),
  passportExpiry: z.string().refine((d) => new Date(d) > new Date(), "Passport must be valid for at least 6 months"),
  // Mahram (Saudi Arabia requires mahram for women under 45 without a group)
  mahramName: z.string().optional(),
  mahramRelationship: z.string().optional(),
  mahramPassport: z.string().optional(),
  // Health / travel history
  meningitisVaccineDate: z.string().optional(),
  previousUmrah: z.boolean(),
  previousUmrahYear: z.string().optional(),
});

const travelSchema = z.object({
  departureCity: z.string().min(1, "Select departure city"),
  roomPreference: z.string().optional(),
  specialRequests: z.string().optional(),
  emergencyContactName: z.string().min(2, "Emergency contact name required"),
  emergencyContactPhone: z.string().min(7, "Emergency contact phone required"),
  emergencyContactRelationship: z.string().min(2, "Relationship required"),
});

type PilgrimForm = z.infer<typeof pilgrimSchema>;
type TravelForm = z.infer<typeof travelSchema>;

// ─── Step labels ──────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Package", icon: CheckCircle },
  { label: "Pilgrim Info", icon: User },
  { label: "Visa Details", icon: AlertCircle },
  { label: "Travel", icon: Plane },
  { label: "Payment", icon: CreditCard },
];

// ─── Component ────────────────────────────────────────────────────────────────

const BookingWizard = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { trackActivity } = useTrackActivity();

  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState("");
  const { paystackEnabled } = usePaystackEnabled();
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank">(paystackEnabled ? "card" : "bank");
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [vaccineFile, setVaccineFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingReference, setBookingReference] = useState("");
  const [hasPreviousUmrah, setHasPreviousUmrah] = useState(false);
  const [isFemale, setIsFemale] = useState(false);

  const pilgrimForm = useForm<PilgrimForm>({
    resolver: zodResolver(pilgrimSchema),
    defaultValues: { gender: "male", maritalStatus: "single", previousUmrah: false },
  });

  const travelForm = useForm<TravelForm>({
    resolver: zodResolver(travelSchema),
  });

  const { data: pkg, isLoading: pkgLoading } = useQuery({
    queryKey: ["package", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("*, package_accommodations(*), package_dates(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch active bank accounts for bank transfer option
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts" as any)
        .select("*")
        .eq("is_active", true)
        .order("created_at");
      if (error) {
        console.warn("bank_accounts table not yet created:", error.message);
        return [];
      }
      return data as any[];
    },
  });

  // Fetch latest booking to pre-fill info
  const { data: latestBooking } = useQuery({
    queryKey: ["latest-booking", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!user?.id,
  });

  // Pre-fill form when latest booking is found
  useEffect(() => {
    if (latestBooking) {
      const fb = latestBooking;

      pilgrimForm.reset({
        fullName: fb.full_name || "",
        dateOfBirth: fb.date_of_birth || "",
        gender: (fb.gender as any) || "male",
        maritalStatus: (fb.marital_status as any) || "single",
        nationality: fb.nationality || "",
        placeOfBirth: fb.place_of_birth || "",
        occupation: fb.occupation || "",
        phone: fb.phone || "",
        address: fb.address || "",
        fathersName: fb.fathers_name || "",
        mothersName: fb.mothers_name || "",
        passportNumber: fb.passport_number || "",
        passportExpiry: fb.passport_expiry || "",
        mahramName: fb.mahram_name || "",
        mahramRelationship: fb.mahram_relationship || "",
        mahramPassport: fb.mahram_passport || "",
        meningitisVaccineDate: fb.meningitis_vaccine_date || "",
        previousUmrah: !!fb.previous_umrah,
        previousUmrahYear: fb.previous_umrah_year?.toString() || "",
      });

      travelForm.reset({
        departureCity: fb.departure_city || "",
        roomPreference: fb.room_preference || "",
        specialRequests: fb.special_requests || "",
        emergencyContactName: fb.emergency_contact_name || "",
        emergencyContactPhone: fb.emergency_contact_phone || "",
        emergencyContactRelationship: fb.emergency_contact_relationship || "",
      });

      if (fb.gender === "female") setIsFemale(true);
      if (fb.previous_umrah) setHasPreviousUmrah(true);
    }
  }, [latestBooking, pilgrimForm, travelForm]);

  // ── Submit handler ────────────────────────────────────────────────────────

  const onSubmitBooking = async () => {
    if (!user || !pkg || !selectedDate) return;
    setIsSubmitting(true);

    try {
      const pData = pilgrimForm.getValues();
      const tData = travelForm.getValues();

      // Upload passport photo
      let passportUrl: string | null = null;
      if (passportFile) {
        const fileName = `${user.id}/${Date.now()}_passport.jpg`;
        const { data: up, error: upErr } = await supabase.storage
          .from("passport-photos")
          .upload(fileName, passportFile);
        if (upErr) throw upErr;
        passportUrl = up.path;
      }

      // Upload meningitis vaccine certificate
      let vaccineUrl: string | null = null;
      if (vaccineFile) {
        const fileName = `${user.id}/${Date.now()}_vaccine.pdf`;
        const { data: vUp, error: vErr } = await supabase.storage
          .from("passport-photos")
          .upload(fileName, vaccineFile);
        if (!vErr) vaccineUrl = vUp.path;
      }

      // Create booking with all visa fields
      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          user_id: user.id,
          package_id: pkg.id,
          package_date_id: selectedDate,
          // Personal
          full_name: pData.fullName,
          date_of_birth: pData.dateOfBirth,
          gender: pData.gender,
          marital_status: pData.maritalStatus,
          nationality: pData.nationality,
          place_of_birth: pData.placeOfBirth,
          occupation: pData.occupation,
          phone: pData.phone,
          address: pData.address,
          fathers_name: pData.fathersName,
          mothers_name: pData.mothersName,
          // Passport
          passport_number: pData.passportNumber,
          passport_expiry: pData.passportExpiry,
          // Mahram
          mahram_name: pData.mahramName || null,
          mahram_relationship: pData.mahramRelationship || null,
          mahram_passport: pData.mahramPassport || null,
          // Health
          meningitis_vaccine_date: pData.meningitisVaccineDate || null,
          previous_umrah: pData.previousUmrah,
          previous_umrah_year: pData.previousUmrahYear ? parseInt(pData.previousUmrahYear) : null,
          // Travel
          departure_city: tData.departureCity,
          room_preference: tData.roomPreference,
          special_requests: tData.specialRequests,
          emergency_contact_name: tData.emergencyContactName,
          emergency_contact_phone: tData.emergencyContactPhone,
          emergency_contact_relationship: tData.emergencyContactRelationship,
          status: "pending",
        } as any)
        .select()
        .single();
      if (bookingError) throw bookingError;

      // Save uploaded document records
      if (passportUrl) {
        await supabase.from("documents").insert({
          user_id: user.id, booking_id: bookingData.id,
          file_url: passportUrl, file_name: passportFile!.name, type: "passport",
        });
      }
      if (vaccineUrl) {
        await supabase.from("documents").insert({
          user_id: user.id, booking_id: bookingData.id,
          file_url: vaccineUrl, file_name: vaccineFile!.name, type: "vaccine_certificate",
        });
      }

      // CRITICAL SECURITY: Re-verify package price from server before payment record creation
      const { data: verifiedPkg, error: pkgVerifyError } = await supabase
        .from("packages")
        .select("price, minimum_deposit, deposit_allowed")
        .eq("id", pkg.id)
        .single();

      if (pkgVerifyError || !verifiedPkg) {
        throw new Error("Unauthorized: Package verification failed.");
      }

      // Calculate payment amount based on verified server data
      const paymentAmount = paymentMethod === "card"
        ? Number(verifiedPkg.price)
        : (verifiedPkg.minimum_deposit || Number(verifiedPkg.price));

      // Track payment attempt
      await trackActivity({
        eventType: "payment_attempt",
        packageId: pkg.id,
        bookingId: bookingData.id,
        metadata: { method: paymentMethod, amount: paymentAmount }
      });

      const { error: paymentError } = await supabase.from("payments").insert({
        booking_id: bookingData.id,
        amount: paymentAmount,
        method: paymentMethod === "card" ? "paystack" : "bank_transfer",
        status: "pending",
      });
      if (paymentError) throw paymentError;

      // Card → Paystack Inline Popup
      if (paymentMethod === "card") {
        const { data: paystackData, error: paystackError } = await supabase.functions.invoke(
          "create-paystack-checkout",
          { body: { amount: paymentAmount, email: user.email, bookingId: bookingData.id, reference: bookingData.reference } }
        );

        if (paystackError || !paystackData?.access_code) {
          console.error("Paystack init error:", paystackError);
          toast.error("Failed to initialize Paystack payment. Please try again.");
          return;
        }

        // Load Paystack Inline SDK dynamically
        const loadScript = () => {
          return new Promise((resolve) => {
            const script = document.createElement("script");
            script.src = "https://js.paystack.co/v1/inline.js";
            script.async = true;
            script.onload = () => resolve(true);
            document.body.appendChild(script);
          });
        };

        if (!(window as any).PaystackPop) {
          await loadScript();
        }

        const handler = (window as any).PaystackPop.setup({
          key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
          email: user.email,
          amount: Math.round(paymentAmount * 100),
          access_code: paystackData.access_code,
          callback: (response: any) => {
            console.log("Payment success:", response);
            navigate(`/payment/callback?reference=${response.reference}`);
          },
          onClose: () => {
            console.log("Payment cancelled");
            toast.info("Payment was cancelled");
          },
        });

        handler.openIframe();
        return;
      }

      // Bank transfer → confirmation screen
      setBookingReference(bookingData.reference);
      setStep(6);

      if (paymentMethod === "bank") {
        await trackActivity({
          eventType: "payment_success", // It's just initiation, but for bank we track it as success of the flow
          packageId: pkg.id,
          bookingId: bookingData.id,
          metadata: { method: "bank_transfer", reference: bookingData.reference }
        });
      }

      toast.success("Booking created! Please complete your bank transfer.");
    } catch (error: any) {
      console.error("Booking error:", error);
      toast.error(error.message || "Failed to create booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Loading / not found ───────────────────────────────────────────────────

  if (pkgLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12">
        <div className="container mx-auto max-w-3xl px-4">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }
  if (!pkg) return <div className="text-center py-12 text-muted-foreground">Package not found</div>;

  const makkahAccom = pkg.package_accommodations?.find((a: any) => a.city?.toLowerCase() === "makkah");
  const madinahAccom = pkg.package_accommodations?.find((a: any) => a.city?.toLowerCase() === "madinah");

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12">
      <div className="container mx-auto max-w-3xl px-4">

        {/* ── Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((s, i) => {
              const num = i + 1;
              const active = step === num;
              const done = step > num;
              return (
                <div key={num} className="flex flex-col items-center gap-1 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${done ? "bg-secondary text-secondary-foreground"
                    : active ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground"
                    }`}>
                    {done ? "✓" : num}
                  </div>
                  <span className="text-[10px] text-muted-foreground hidden sm:block">{s.label}</span>
                  {i < STEPS.length - 1 && (
                    <div className={`absolute hidden sm:block`} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-secondary transition-all duration-500"
              style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key={step}>

          {/* ══ Step 1: Package Confirmation ══════════════════════════════════ */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Confirm Package</CardTitle>
                <CardDescription>Review your selected package and choose a travel date</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                  <h3 className="font-heading text-base font-bold">{pkg.name}</h3>
                  <p className="text-muted-foreground">{pkg.description}</p>
                  <Separator />
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div><p className="text-muted-foreground text-xs">Price</p><p className="font-bold text-secondary">₦{Number(pkg.price).toLocaleString()}</p></div>
                    <div><p className="text-muted-foreground text-xs">Duration</p><p className="font-medium">{pkg.duration}</p></div>
                    <div><p className="text-muted-foreground text-xs">Type</p><p className="font-medium capitalize">{pkg.type}</p></div>
                  </div>
                </div>

                <div>
                  <Label className="font-medium mb-3 block">Select Travel Date *</Label>
                  <div className="space-y-2">
                    {pkg.package_dates?.length === 0 && (
                      <p className="text-sm text-muted-foreground py-4 text-center">No dates available for this package</p>
                    )}
                    {pkg.package_dates?.map((date: any) => (
                      <button
                        key={date.id}
                        onClick={() => setSelectedDate(date.id)}
                        className={`w-full p-4 border-2 rounded-lg text-left transition-all ${selectedDate === date.id ? "border-secondary bg-secondary/10" : "border-border hover:border-secondary/50"
                          }`}
                      >
                        <p className="font-medium">{format(new Date(date.outbound), "dd MMM yyyy")} → {format(new Date(date.return_date), "dd MMM yyyy")}</p>
                        {date.outbound_route && <p className="text-xs text-muted-foreground mt-0.5">{date.outbound_route} → {date.return_route}</p>}
                        {date.islamic_date && <p className="text-xs text-secondary/80 mt-0.5">Islamic: {date.islamic_date}</p>}
                        {date.airline && <p className="text-xs text-muted-foreground">✈ {date.airline}</p>}
                      </button>
                    ))}
                  </div>
                </div>

                <Button onClick={() => selectedDate ? setStep(2) : toast.error("Please select a travel date")} className="w-full">
                  Continue
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ══ Step 2: Personal & Passport Information ═══════════════════════ */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Enter details exactly as they appear on your passport</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">

                {/* Personal */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label>Full Name (as on passport) *</Label>
                    <Input {...pilgrimForm.register("fullName")} placeholder="e.g. Fatima Abubakar Musa" />
                    {pilgrimForm.formState.errors.fullName && <p className="text-xs text-destructive mt-1">{pilgrimForm.formState.errors.fullName.message}</p>}
                  </div>
                  <div>
                    <Label>Date of Birth *</Label>
                    <Input type="date" {...pilgrimForm.register("dateOfBirth")} />
                  </div>
                  <div>
                    <Label>Gender *</Label>
                    <select
                      {...pilgrimForm.register("gender")}
                      onChange={(e) => { pilgrimForm.setValue("gender", e.target.value as "male" | "female"); setIsFemale(e.target.value === "female"); }}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div>
                    <Label>Marital Status *</Label>
                    <select {...pilgrimForm.register("maritalStatus")} className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm">
                      <option value="single">Single</option>
                      <option value="married">Married</option>
                      <option value="widowed">Widowed</option>
                      <option value="divorced">Divorced</option>
                    </select>
                  </div>
                  <div>
                    <Label>Nationality *</Label>
                    <Input {...pilgrimForm.register("nationality")} placeholder="e.g. Nigerian" />
                  </div>
                  <div>
                    <Label>Place of Birth *</Label>
                    <Input {...pilgrimForm.register("placeOfBirth")} placeholder="City, Country" />
                  </div>
                  <div>
                    <Label>Occupation *</Label>
                    <Input {...pilgrimForm.register("occupation")} placeholder="e.g. Teacher, Engineer" />
                  </div>
                  <div>
                    <Label>Phone Number *</Label>
                    <Input {...pilgrimForm.register("phone")} placeholder="+234 800 000 0000" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Home Address *</Label>
                    <Input {...pilgrimForm.register("address")} placeholder="No. 12, Street Name, City, State" />
                  </div>
                  <div>
                    <Label>Father's Full Name *</Label>
                    <Input {...pilgrimForm.register("fathersName")} placeholder="Father's full name" />
                  </div>
                  <div>
                    <Label>Mother's Full Name *</Label>
                    <Input {...pilgrimForm.register("mothersName")} placeholder="Mother's full name" />
                  </div>
                </div>

                <Separator />
                <h3 className="text-sm font-semibold text-foreground">Passport Details</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Passport Number *</Label>
                    <Input {...pilgrimForm.register("passportNumber")} placeholder="A12345678" className="uppercase" />
                    {pilgrimForm.formState.errors.passportNumber && <p className="text-xs text-destructive mt-1">{pilgrimForm.formState.errors.passportNumber.message}</p>}
                  </div>
                  <div>
                    <Label>Passport Expiry Date *</Label>
                    <Input type="date" {...pilgrimForm.register("passportExpiry")} />
                    {pilgrimForm.formState.errors.passportExpiry && <p className="text-xs text-destructive mt-1">{pilgrimForm.formState.errors.passportExpiry.message}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Passport Photo Page (scan/photo)</Label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => e.target.files && setPassportFile(e.target.files[0])}
                      className="w-full px-3 py-2 border border-input rounded-md text-sm"
                    />
                    {passportFile && <p className="text-xs text-secondary mt-1">✓ {passportFile.name}</p>}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                  <Button onClick={async () => {
                    const valid = await pilgrimForm.trigger([
                      "fullName", "dateOfBirth", "gender", "maritalStatus", "nationality",
                      "placeOfBirth", "occupation", "phone", "address",
                      "fathersName", "mothersName", "passportNumber", "passportExpiry"
                    ]);
                    if (valid) setStep(3);
                    else toast.error("Please fill in all required fields");
                  }} className="flex-1">
                    Continue
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ══ Step 3: Visa / Health / Mahram Details ════════════════════════ */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Visa & Health Information</CardTitle>
                <CardDescription>Required for Saudi Arabia Umrah visa application</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Meningitis vaccine */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-amber-800 mb-1">⚠ Saudi Requirement</p>
                  <p className="text-xs text-amber-700">All pilgrims must have the Meningitis ACWY vaccine within 3–5 years of travel.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Meningitis Vaccine Date</Label>
                    <Input type="date" {...pilgrimForm.register("meningitisVaccineDate")} />
                    <p className="text-xs text-muted-foreground mt-1">Date of Meningitis ACWY vaccination</p>
                  </div>
                  <div>
                    <Label>Vaccine Certificate (PDF/Image)</Label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => e.target.files && setVaccineFile(e.target.files[0])}
                      className="w-full px-3 py-2 border border-input rounded-md text-sm"
                    />
                    {vaccineFile && <p className="text-xs text-secondary mt-1">✓ {vaccineFile.name}</p>}
                  </div>
                </div>

                {/* Previous Umrah */}
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Umrah History</h3>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="prev-umrah"
                      checked={hasPreviousUmrah}
                      onChange={(e) => {
                        setHasPreviousUmrah(e.target.checked);
                        pilgrimForm.setValue("previousUmrah", e.target.checked);
                      }}
                      className="h-4 w-4 accent-secondary"
                    />
                    <Label htmlFor="prev-umrah">I have performed Umrah before</Label>
                  </div>
                  {hasPreviousUmrah && (
                    <div>
                      <Label>Year of Last Umrah</Label>
                      <Input
                        type="number"
                        min={2000}
                        max={new Date().getFullYear()}
                        placeholder="e.g. 2022"
                        {...pilgrimForm.register("previousUmrahYear")}
                      />
                    </div>
                  )}
                </div>

                {/* Mahram (female pilgrims) */}
                {isFemale && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-semibold">Mahram Information</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Female pilgrims under 45 or travelling without spouse/family group require a mahram (male guardian).
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label>Mahram Full Name</Label>
                          <Input {...pilgrimForm.register("mahramName")} placeholder="Mahram's full name" />
                        </div>
                        <div>
                          <Label>Relationship</Label>
                          <select {...pilgrimForm.register("mahramRelationship")} className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm">
                            <option value="">Select relationship</option>
                            <option value="husband">Husband</option>
                            <option value="father">Father</option>
                            <option value="brother">Brother</option>
                            <option value="son">Son</option>
                            <option value="uncle">Uncle</option>
                          </select>
                        </div>
                        <div>
                          <Label>Mahram Passport Number</Label>
                          <Input {...pilgrimForm.register("mahramPassport")} placeholder="Mahram's passport number" />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
                  <Button onClick={() => setStep(4)} className="flex-1">Continue</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ══ Step 4: Travel Preferences ════════════════════════════════════ */}
          {step === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>Travel Preferences</CardTitle>
                <CardDescription>Room preference and emergency contact</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Departure City *</Label>
                  <select {...travelForm.register("departureCity")} className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm">
                    <option value="">Select city</option>
                    {pkg.departure_cities?.map((city: string) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Room Preference</Label>
                  <select {...travelForm.register("roomPreference")} className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm">
                    <option value="">Select preference</option>
                    {[makkahAccom, madinahAccom].map((acc) =>
                      acc?.room_types?.map((type: string) => (
                        <option key={type} value={type}>{type}</option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <Label>Special Requests / Medical Needs</Label>
                  <textarea
                    {...travelForm.register("specialRequests")}
                    placeholder="Wheelchair assistance, dietary needs, medical conditions, etc."
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                    rows={3}
                  />
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                  <h4 className="font-medium text-sm">Emergency Contact *</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label>Contact Name</Label>
                      <Input {...travelForm.register("emergencyContactName")} placeholder="Full name" />
                    </div>
                    <div>
                      <Label>Contact Phone</Label>
                      <Input {...travelForm.register("emergencyContactPhone")} placeholder="+234 800 000 0000" />
                    </div>
                    <div>
                      <Label>Relationship</Label>
                      <Input {...travelForm.register("emergencyContactRelationship")} placeholder="Spouse, Parent, etc." />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setStep(3)} className="flex-1">Back</Button>
                  <Button onClick={async () => {
                    const valid = await travelForm.trigger(["departureCity", "emergencyContactName", "emergencyContactPhone", "emergencyContactRelationship"]);
                    if (valid) setStep(5);
                    else toast.error("Please fill emergency contact details");
                  }} className="flex-1">
                    Continue
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ══ Step 5: Payment ════════════════════════════════════════════════ */}
          {step === 5 && (
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>Choose how you would like to pay</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                  <p className="text-3xl font-bold text-secondary">₦{Number(pkg.price).toLocaleString()}</p>
                  {pkg.deposit_allowed && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Minimum deposit: ₦{Number(pkg.minimum_deposit || 0).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  {/* Card — only shown when Paystack is enabled */}
                  {paystackEnabled && (
                    <button
                      onClick={() => setPaymentMethod("card")}
                      className={`w-full p-4 border-2 rounded-lg text-left transition-all ${paymentMethod === "card" ? "border-secondary bg-secondary/10" : "border-border hover:border-secondary/50"
                        }`}
                    >
                      <p className="font-medium">💳 Card Payment (Paystack)</p>
                      <p className="text-xs text-muted-foreground">Pay securely with debit or credit card</p>
                    </button>
                  )}

                  {/* Bank transfer */}
                  <button
                    onClick={() => setPaymentMethod("bank")}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-all ${paymentMethod === "bank" ? "border-secondary bg-secondary/10" : "border-border hover:border-secondary/50"
                      }`}
                  >
                    <p className="font-medium">🏦 Bank Transfer</p>
                    <p className="text-xs text-muted-foreground">Transfer directly to our bank account</p>
                  </button>

                  {/* Show bank accounts when bank transfer selected */}
                  {paymentMethod === "bank" && (
                    <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
                      <p className="text-sm font-semibold">Bank Account Details</p>
                      {bankAccounts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Contact our office for bank details.</p>
                      ) : (
                        bankAccounts.map((acct: any) => (
                          <div key={acct.id} className="bg-background rounded-lg p-3 text-sm space-y-1 border border-border">
                            <p className="font-bold text-foreground">{acct.bank_name}</p>
                            <p className="text-muted-foreground">Account Name: <span className="font-medium text-foreground">{acct.account_name}</span></p>
                            <p className="text-muted-foreground">Account No: <span className="font-mono font-bold text-secondary text-base">{acct.account_number}</span></p>
                            {acct.sort_code && <p className="text-muted-foreground">Sort Code: <span className="font-medium">{acct.sort_code}</span></p>}
                          </div>
                        ))
                      )}
                      <p className="text-xs text-muted-foreground">
                        Use your booking reference as the payment description. Upload proof of payment in your dashboard after transfer.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(4)} className="flex-1">Back</Button>
                  <Button onClick={onSubmitBooking} disabled={isSubmitting} className="flex-1">
                    {isSubmitting ? "Processing…" : paymentMethod === "card" ? "Pay with Paystack" : "Confirm Booking"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ══ Step 6: Confirmation ═══════════════════════════════════════════ */}
          {step === 6 && (
            <Card>
              <CardContent className="py-8 space-y-6">
                <div className="flex flex-col items-center gap-2">
                  <SuccessAnimation size={90} />
                  <h2 className="font-heading text-xl font-bold text-foreground">Booking Confirmed!</h2>
                  <p className="text-sm text-muted-foreground text-center">Your booking has been submitted successfully</p>
                </div>

                <div className="text-center space-y-1">
                  <p className="text-muted-foreground text-sm">Your Booking Reference</p>
                  <p className="text-2xl font-bold font-mono text-secondary">{bookingReference}</p>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
                  <p><span className="font-medium">Package:</span> {pkg.name}</p>
                  <p><span className="font-medium">Amount:</span> ₦{Number(pkg.price).toLocaleString()}</p>
                  <p><span className="font-medium">Status:</span> <span className="text-amber-600">Pending Payment Confirmation</span></p>
                </div>

                {bankAccounts.length > 0 && (
                  <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-2">
                    <p className="text-sm font-semibold">Next Step — Complete Your Transfer</p>
                    {bankAccounts.map((acct: any) => (
                      <div key={acct.id} className="text-sm">
                        <p><span className="text-muted-foreground">Bank:</span> {acct.bank_name}</p>
                        <p><span className="text-muted-foreground">Account:</span> <span className="font-mono font-bold text-secondary">{acct.account_number}</span></p>
                        <p><span className="text-muted-foreground">Name:</span> {acct.account_name}</p>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground">Reference: <span className="font-mono">{bookingReference}</span></p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  After payment, upload your proof of payment from the "My Payments" section in your dashboard.
                </p>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => navigate("/dashboard/bookings")} className="flex-1">My Bookings</Button>
                  <Button onClick={() => navigate("/packages")} className="flex-1">Browse More</Button>
                </div>
              </CardContent>
            </Card>
          )}

        </motion.div>
      </div>
    </div>
  );
};

export default BookingWizard;
