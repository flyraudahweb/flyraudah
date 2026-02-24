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
import { AlertCircle, User, Plane, CreditCard, CheckCircle, Upload, CheckCircle2, Loader2 } from "lucide-react";
import { useTrackActivity } from "@/hooks/useTrackActivity";
import { usePaystackEnabled } from "@/hooks/usePaystackEnabled";
import SuccessAnimation from "@/components/animations/SuccessAnimation";
import { useBookingFormFields, useSystemFieldConfig } from "@/hooks/useBookingFormFields";
import CustomFieldsSection from "@/components/bookings/CustomFieldsSection";

// ─── Zod schemas ──────────────────────────────────────────────────────────────
// NOTE: All sysField-controlled fields are .optional() so the admin's
// "required" toggle is the single source of truth. Hard validation is applied
// in the Continue button handlers based on sysField config.
// Only passport number format and expiry are always enforced (Saudi legal requirement).

const pilgrimSchema = z.object({
  // Personal (all configurable by admin)
  fullName: z.string().optional().default(""),
  dateOfBirth: z.string().optional().default(""),
  gender: z.enum(["male", "female"]).default("male"),
  maritalStatus: z.enum(["single", "married", "widowed", "divorced"]).default("single"),
  nationality: z.string().optional().default(""),
  placeOfBirth: z.string().optional().default(""),
  occupation: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  address: z.string().optional().default(""),
  // Parents — optional (admin can disable)
  fathersName: z.string().optional().default(""),
  mothersName: z.string().optional().default(""),
  // Passport — always required (Saudi Umrah visa legal requirement)
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
  departureCity: z.string().optional().default(""),
  roomPreference: z.string().optional(),
  specialRequests: z.string().optional(),
  // Emergency contact — all optional (admin can disable individual fields)
  emergencyContactName: z.string().optional().default(""),
  emergencyContactPhone: z.string().optional().default(""),
  emergencyContactRelationship: z.string().optional().default(""),
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

  // ── Draft auto-save key (per package per user) ───────────────────────────
  const draftKey = `booking-draft-${user?.id ?? "guest"}-${id ?? "pkg"}`;

  const loadDraft = () => {
    try {
      const raw = localStorage.getItem(draftKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const draft = loadDraft();

  const [step, setStep] = useState(() => draft?.step ?? 1);
  const [selectedDate, setSelectedDate] = useState(() => draft?.selectedDate ?? "");
  const { paystackEnabled } = usePaystackEnabled();
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank">(paystackEnabled ? "card" : "bank");
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [vaccineFile, setVaccineFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingReference, setBookingReference] = useState("");
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(() => draft?.pendingBookingId ?? null);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(() => draft?.pendingPaymentId ?? null);
  const [hasPreviousUmrah, setHasPreviousUmrah] = useState(false);
  const [isFemale, setIsFemale] = useState(false);
  const [transferProofUrl, setTransferProofUrl] = useState("");
  const [proofUploading, setProofUploading] = useState(false);

  const handleProofUpload = async (file: File) => {
    setProofUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `user-proofs/${user?.id ?? "anon"}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("booking-attachments")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from("booking-attachments")
        .getPublicUrl(path);
      setTransferProofUrl(urlData.publicUrl);
      toast.success("Proof of payment uploaded!");
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setProofUploading(false);
    }
  };

  // ── Custom dynamic form fields ────────────────────────────────────────────
  const { data: customFields = [] } = useBookingFormFields("user");
  const [customData, setCustomData] = useState<Record<string, string>>({});
  const [customUploading, setCustomUploading] = useState<Record<string, boolean>>({});
  const handleCustomChange = (key: string, value: string) => setCustomData((p) => ({ ...p, [key]: value }));
  // ── System field config (admin-editable labels, enabled toggles) ────────────
  const { get: sysField } = useSystemFieldConfig();

  const pilgrimForm = useForm<PilgrimForm>({
    resolver: zodResolver(pilgrimSchema),
    defaultValues: draft?.pilgrim ?? { gender: "male", maritalStatus: "single", previousUmrah: false },
  });

  const travelForm = useForm<TravelForm>({
    resolver: zodResolver(travelSchema),
    defaultValues: draft?.travel ?? {},
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
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!user?.id,
  });

  // Pre-fill from latest booking ONLY if no draft exists
  useEffect(() => {
    if (latestBooking && !loadDraft()) {
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
  }, [latestBooking]);

  // Auto-save draft to localStorage whenever form values change
  const pilgrimValues = pilgrimForm.watch();
  const travelValues = travelForm.watch();

  useEffect(() => {
    const handler = setTimeout(() => {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({
            step,
            selectedDate,
            pilgrim: pilgrimValues,
            travel: travelValues,
            pendingBookingId,
            pendingPaymentId,
          })
        );
      } catch { }
    }, 800); // debounce 800 ms
    return () => clearTimeout(handler);
  }, [draftKey, step, selectedDate, pilgrimValues, travelValues, pendingBookingId, pendingPaymentId]);


  // ── Submit handler ────────────────────────────────────────────────────────

  const onSubmitBooking = async () => {
    if (!user || !pkg || !selectedDate || isSubmitting) return;
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

      // Create/Update booking with all visa fields
      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .upsert({
          id: pendingBookingId || undefined,
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
          custom_data: Object.keys(customData).length > 0 ? customData : null,
        } as any)
        .select()
        .single();
      if (bookingError) throw bookingError;
      setPendingBookingId(bookingData.id);

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

      // Use the already-loaded pkg (from useQuery) — the DB trigger validates the
      // amount server-side anyway, so no need for a redundant re-fetch.
      // Always Number()-cast: Supabase returns numeric columns as strings in JS.
      const safePrice = Number(pkg.price) || 0;
      const safeDeposit = Number(pkg.minimum_deposit) || 0;
      const depositEnabled = pkg.deposit_allowed === true && safeDeposit > 0;

      const paymentAmount = paymentMethod === "card"
        ? safePrice
        : (depositEnabled ? safeDeposit : safePrice);

      // Track payment attempt
      await trackActivity({
        eventType: "payment_attempt",
        packageId: pkg.id,
        bookingId: bookingData.id,
        metadata: { method: paymentMethod, amount: paymentAmount }
      });

      const { data: paymentData, error: paymentError } = await supabase
        .from("payments")
        .upsert({
          id: pendingPaymentId || undefined,
          booking_id: bookingData.id,
          amount: paymentAmount,
          method: paymentMethod === "card" ? "paystack" : "bank_transfer",
          status: "pending",
          proof_of_payment_url: paymentMethod === "bank" && transferProofUrl ? transferProofUrl : null,
        })
        .select()
        .single();
      if (paymentError) throw paymentError;
      if (paymentData) setPendingPaymentId(paymentData.id);

      // Card → Paystack Inline Popup
      // NOTE: amount is NOT sent from client — the edge function fetches it from the DB.
      if (paymentMethod === "card") {
        // Refresh the session first so the Supabase client always sends
        // a valid, non-expired JWT to the edge function (verify_jwt: true).
        await supabase.auth.refreshSession();
        const { data: paystackData, error: paystackError } = await supabase.functions.invoke(
          "create-paystack-checkout",
          { body: { email: user.email, bookingId: bookingData.id } }
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
          // Use server-returned amount (not client-side paymentAmount) for display only
          amount: Math.round((paystackData.amount ?? paymentAmount) * 100),
          access_code: paystackData.access_code,
          callback: (response: any) => {
            console.log("Payment success:", response);
            try { localStorage.removeItem(draftKey); } catch { }
            navigate(`/payment/callback?reference=${response.reference}`);
          },
          onClose: () => {
            toast.info("Payment was cancelled");
          },
        });

        handler.openIframe();
        return;
      }

      // Bank transfer → confirmation screen
      setBookingReference(bookingData.reference);
      try { localStorage.removeItem(draftKey); } catch { }
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
                  {sysField('full_name', 'Full Name (as on passport)').enabled && (
                    <div className="sm:col-span-2">
                      <Label>{sysField('full_name', 'Full Name (as on passport)').label}{sysField('full_name', 'Full Name (as on passport)').required && <span className="text-destructive ml-1">*</span>}</Label>
                      <Input {...pilgrimForm.register("fullName")} placeholder={sysField('full_name', '', 'e.g. Fatima Abubakar Musa').placeholder ?? 'e.g. Fatima Abubakar Musa'} />
                      {pilgrimForm.formState.errors.fullName && <p className="text-xs text-destructive mt-1">{pilgrimForm.formState.errors.fullName.message}</p>}
                    </div>
                  )}
                  {sysField('date_of_birth', 'Date of Birth').enabled && (
                    <div>
                      <Label>{sysField('date_of_birth', 'Date of Birth').label}{sysField('date_of_birth', 'Date of Birth').required && <span className="text-destructive ml-1">*</span>}</Label>
                      <Input type="date" {...pilgrimForm.register("dateOfBirth")} />
                    </div>
                  )}
                  {sysField('gender', 'Gender').enabled && (
                    <div>
                      <Label>{sysField('gender', 'Gender').label}{sysField('gender', 'Gender').required && <span className="text-destructive ml-1">*</span>}</Label>
                      <select
                        {...pilgrimForm.register("gender")}
                        onChange={(e) => { pilgrimForm.setValue("gender", e.target.value as "male" | "female"); setIsFemale(e.target.value === "female"); }}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                  )}
                  {sysField('marital_status', 'Marital Status').enabled && (
                    <div>
                      <Label>{sysField('marital_status', 'Marital Status').label}{sysField('marital_status', 'Marital Status').required && <span className="text-destructive ml-1">*</span>}</Label>
                      <select {...pilgrimForm.register("maritalStatus")} className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm">
                        <option value="single">Single</option>
                        <option value="married">Married</option>
                        <option value="widowed">Widowed</option>
                        <option value="divorced">Divorced</option>
                      </select>
                    </div>
                  )}
                  {sysField('nationality', 'Nationality').enabled && (
                    <div>
                      <Label>{sysField('nationality', 'Nationality').label}{sysField('nationality', 'Nationality').required && <span className="text-destructive ml-1">*</span>}</Label>
                      <Input {...pilgrimForm.register("nationality")} placeholder={sysField('nationality', '', 'e.g. Nigerian').placeholder ?? 'e.g. Nigerian'} />
                    </div>
                  )}
                  {sysField('place_of_birth', 'Place of Birth').enabled && (
                    <div>
                      <Label>{sysField('place_of_birth', 'Place of Birth').label}{sysField('place_of_birth', 'Place of Birth').required && <span className="text-destructive ml-1">*</span>}</Label>
                      <Input {...pilgrimForm.register("placeOfBirth")} placeholder={sysField('place_of_birth', '', 'City, Country').placeholder ?? 'City, Country'} />
                    </div>
                  )}
                  {sysField('occupation', 'Occupation').enabled && (
                    <div>
                      <Label>{sysField('occupation', 'Occupation').label}{sysField('occupation', 'Occupation').required && <span className="text-destructive ml-1">*</span>}</Label>
                      <Input {...pilgrimForm.register("occupation")} placeholder={sysField('occupation', '', 'e.g. Teacher, Engineer').placeholder ?? 'e.g. Teacher, Engineer'} />
                    </div>
                  )}
                  {sysField('phone', 'Phone Number').enabled && (
                    <div>
                      <Label>{sysField('phone', 'Phone Number').label}{sysField('phone', 'Phone Number').required && <span className="text-destructive ml-1">*</span>}</Label>
                      <Input {...pilgrimForm.register("phone")} placeholder={sysField('phone', '', '+234 800 000 0000').placeholder ?? '+234 800 000 0000'} />
                    </div>
                  )}
                  {sysField('address', 'Home Address').enabled && (
                    <div className="sm:col-span-2">
                      <Label>{sysField('address', 'Home Address').label}{sysField('address', 'Home Address').required && <span className="text-destructive ml-1">*</span>}</Label>
                      <Input {...pilgrimForm.register("address")} placeholder={sysField('address', '', 'No. 12, Street Name, City, State').placeholder ?? 'No. 12, Street Name, City, State'} />
                    </div>
                  )}
                  {sysField('fathers_name', "Father's Name").enabled && (
                    <div>
                      <Label>{sysField('fathers_name', "Father's Name").label}{sysField('fathers_name', "Father's Name").required && <span className="text-destructive ml-1">*</span>}</Label>
                      <Input {...pilgrimForm.register("fathersName")} placeholder="Father's full name" />
                    </div>
                  )}
                  {sysField('mothers_name', "Mother's Name").enabled && (
                    <div>
                      <Label>{sysField('mothers_name', "Mother's Name").label}{sysField('mothers_name', "Mother's Name").required && <span className="text-destructive ml-1">*</span>}</Label>
                      <Input {...pilgrimForm.register("mothersName")} placeholder="Mother's full name" />
                    </div>
                  )}
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
                    // Always validate passport (absolute requirement)
                    const valid = await pilgrimForm.trigger(["passportNumber", "passportExpiry"]);
                    // Validate sysField-controlled fields only when they are enabled AND required
                    const sysRequiredFields: Array<keyof PilgrimForm> = [];
                    const sysFieldMap: Array<{ key: string; field: keyof PilgrimForm; min?: number }> = [
                      { key: "full_name", field: "fullName", min: 2 },
                      { key: "date_of_birth", field: "dateOfBirth", min: 1 },
                      { key: "nationality", field: "nationality", min: 2 },
                      { key: "place_of_birth", field: "placeOfBirth", min: 2 },
                      { key: "occupation", field: "occupation", min: 2 },
                      { key: "phone", field: "phone", min: 7 },
                      { key: "address", field: "address", min: 5 },
                      { key: "fathers_name", field: "fathersName", min: 2 },
                      { key: "mothers_name", field: "mothersName", min: 2 },
                    ];
                    let missingRequired = false;
                    for (const { key, field, min } of sysFieldMap) {
                      const cfg = sysField(key, "");
                      if (cfg.enabled && cfg.required) {
                        const val = pilgrimForm.getValues(field as any) ?? "";
                        if (typeof val === "string" && val.length < (min ?? 1)) {
                          pilgrimForm.setError(field as any, { message: `${cfg.label} is required` });
                          missingRequired = true;
                        }
                      }
                    }
                    if (valid && !missingRequired) setStep(3);
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
                  {sysField('meningitis_vaccine_date', 'Meningitis Vaccine Date').enabled && (
                    <div>
                      <Label>{sysField('meningitis_vaccine_date', 'Meningitis Vaccine Date').label}</Label>
                      <Input type="date" {...pilgrimForm.register("meningitisVaccineDate")} />
                      <p className="text-xs text-muted-foreground mt-1">Date of Meningitis ACWY vaccination</p>
                    </div>
                  )}
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
                {sysField('previous_umrah', 'Umrah History').enabled && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">{sysField('previous_umrah', 'Umrah History').label}</h3>
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
                    {hasPreviousUmrah && sysField('previous_umrah_year', 'Year of Last Umrah').enabled && (
                      <div>
                        <Label>{sysField('previous_umrah_year', 'Year of Last Umrah').label}</Label>
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
                )}

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
                        {sysField('mahram_name', 'Mahram Full Name').enabled && (
                          <div>
                            <Label>{sysField('mahram_name', 'Mahram Full Name').label}</Label>
                            <Input {...pilgrimForm.register("mahramName")} placeholder="Mahram's full name" />
                          </div>
                        )}
                        {sysField('mahram_relationship', 'Mahram Relationship').enabled && (
                          <div>
                            <Label>{sysField('mahram_relationship', 'Mahram Relationship').label}</Label>
                            <select {...pilgrimForm.register("mahramRelationship")} className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm">
                              <option value="">Select relationship</option>
                              <option value="husband">Husband</option>
                              <option value="father">Father</option>
                              <option value="brother">Brother</option>
                              <option value="son">Son</option>
                              <option value="uncle">Uncle</option>
                            </select>
                          </div>
                        )}
                        {sysField('mahram_passport', 'Mahram Passport Number').enabled && (
                          <div>
                            <Label>{sysField('mahram_passport', 'Mahram Passport Number').label}</Label>
                            <Input {...pilgrimForm.register("mahramPassport")} placeholder="Mahram's passport number" />
                          </div>
                        )}
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

                {sysField('special_requests', 'Special Requests / Medical Needs').enabled && (
                  <div>
                    <Label>{sysField('special_requests', 'Special Requests / Medical Needs').label}</Label>
                    <textarea
                      {...travelForm.register("specialRequests")}
                      placeholder={sysField('special_requests', '', 'Wheelchair assistance, dietary needs, medical conditions, etc.').placeholder ?? 'Wheelchair assistance, dietary needs, medical conditions, etc.'}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                      rows={3}
                    />
                  </div>
                )}

                <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                  <h4 className="font-medium text-sm">Emergency Contact *</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sysField('emergency_contact_name', 'Emergency Contact Name').enabled && (
                      <div>
                        <Label>{sysField('emergency_contact_name', 'Emergency Contact Name').label}</Label>
                        <Input {...travelForm.register("emergencyContactName")} placeholder="Full name" />
                      </div>
                    )}
                    {sysField('emergency_contact_phone', 'Emergency Contact Phone').enabled && (
                      <div>
                        <Label>{sysField('emergency_contact_phone', 'Emergency Contact Phone').label}</Label>
                        <Input {...travelForm.register("emergencyContactPhone")} placeholder="+234 800 000 0000" />
                      </div>
                    )}
                    {sysField('emergency_contact_relationship', 'Emergency Contact Relationship').enabled && (
                      <div>
                        <Label>{sysField('emergency_contact_relationship', 'Emergency Contact Relationship').label}</Label>
                        <Input {...travelForm.register("emergencyContactRelationship")} placeholder="Spouse, Parent, etc." />
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Admin-defined custom fields ── */}
                {customFields.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <p className="text-sm font-medium text-muted-foreground">Additional Information</p>
                    <CustomFieldsSection
                      fields={customFields}
                      values={customData}
                      onChange={handleCustomChange}
                      uploading={customUploading}
                      onUploadingChange={(key, val) =>
                        setCustomUploading((p) => ({ ...p, [key]: val }))
                      }
                    />
                  </div>
                )}

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
                        Use your booking reference as the payment description.
                      </p>

                      {/* Proof of payment upload */}
                      <div className="rounded-xl border border-dashed border-amber-400 bg-amber-50 dark:bg-amber-900/10 p-4 space-y-3 mt-2">
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                          ⚠ Upload your proof of payment before confirming
                        </p>
                        {transferProofUrl ? (
                          <div className="flex items-center gap-2 text-xs text-emerald-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <a href={transferProofUrl} target="_blank" rel="noopener noreferrer" className="underline truncate max-w-[220px]">
                              Proof uploaded ✓
                            </a>
                          </div>
                        ) : (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              onChange={(e) => e.target.files?.[0] && handleProofUpload(e.target.files[0])}
                            />
                            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-md border border-input bg-background text-xs hover:bg-muted transition-colors ${proofUploading ? "opacity-50 pointer-events-none" : ""}`}>
                              {proofUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                              {proofUploading ? "Uploading…" : "Choose Receipt / Teller"}
                            </span>
                          </label>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(4)} className="flex-1">Back</Button>
                  <Button
                    onClick={onSubmitBooking}
                    disabled={isSubmitting || (paymentMethod === "bank" && !transferProofUrl)}
                    className="flex-1"
                  >
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
                  <h2 className="font-heading text-xl font-bold text-foreground">
                    {paymentMethod === "bank" ? "Booking Submitted!" : "Booking Confirmed!"}
                  </h2>
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

                {(bankAccounts.length > 0 && !transferProofUrl) ? (
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
                ) : paymentMethod === "bank" ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 space-y-2 text-center">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto mb-1" />
                    <p className="text-sm font-semibold text-emerald-700">Payment Proof Received</p>
                    <p className="text-xs text-emerald-600/80">
                      We've received your proof of payment. Our team will verify it and confirm your booking shortly.
                    </p>
                  </div>
                ) : null}

                {(!transferProofUrl && paymentMethod === "bank") && (
                  <p className="text-xs text-muted-foreground text-center">
                    After payment, upload your proof of payment from the "My Payments" section in your dashboard.
                  </p>
                )}

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
