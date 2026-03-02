import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { CheckCircle, CreditCard, Upload, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatPrice } from "@/data/packages";
import { usePaystackEnabled } from "@/hooks/usePaystackEnabled";
import PassportScannerWidget, { PassportExtractedFields } from "./PassportScannerWidget";

// ── Types ──────────────────────────────────────────────────────────────────────
export type BookingMode = "user" | "agent" | "admin";

interface Props {
    pkg?: any;
    mode: BookingMode;
    agent?: any;
    backUrl?: string;
    onSuccess?: (ref: string, id: string) => void;
}

// ── CSS helper — inset shadow input ───────────────────────────────────────────
const inset =
    "w-full px-3 py-2.5 rounded-lg border border-border bg-muted/30 text-sm " +
    "focus:outline-none focus:ring-2 focus:ring-primary/30 " +
    "shadow-[inset_0_1px_4px_rgba(0,0,0,0.07)] transition-shadow placeholder:text-muted-foreground/60";

// ── Step bar ──────────────────────────────────────────────────────────────────
// Always 3 steps. Step 3 label = "Confirm" for admin, "Payment" for user/agent.
function StepBar({ current, isAdmin }: { current: number; isAdmin: boolean }) {
    const steps = ["Package & Date", "Pilgrim Details", isAdmin ? "Confirm" : "Payment"] as const;

    return (
        <div className="flex items-center mb-8 select-none">
            {steps.map((label, i) => {
                const num = i + 1;
                const active = current === num;
                const done = current > num;
                return (
                    <div key={num} className="flex items-center flex-1 min-w-0">
                        {/* Circle */}
                        <div className="flex flex-col items-center gap-1 shrink-0">
                            <div className={[
                                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                                done ? "bg-emerald-500 text-white shadow-sm" :
                                    active ? "bg-primary text-primary-foreground shadow-[0_0_0_4px_hsl(var(--primary)/.15)]" :
                                        "bg-muted text-muted-foreground",
                            ].join(" ")}>
                                {done ? "✓" : num}
                            </div>
                            <span className={`text-[10px] font-medium tracking-wide hidden sm:block whitespace-nowrap
                ${active ? "text-primary" : done ? "text-emerald-600" : "text-muted-foreground"}`}>
                                {label}
                            </span>
                        </div>
                        {/* Connector */}
                        {i < steps.length - 1 && (
                            <div className={`flex-1 h-px mx-2 mt-[-14px] transition-all duration-500
                ${done ? "bg-emerald-400" : "bg-muted-foreground/20"}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ── Small label for fields ─────────────────────────────────────────────────────
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
    return (
        <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
            {children}{required && <span className="text-destructive ml-0.5">*</span>}
        </label>
    );
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function UnifiedBookingWizard({ pkg: pkgProp, mode, agent, backUrl, onSuccess }: Props) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { paystackEnabled } = usePaystackEnabled();
    const isAdmin = mode === "admin";

    // ── State ──────────────────────────────────────────────────────────────────────
    const [step, setStep] = useState(1);
    const [pkgId, setPkgId] = useState<string>(pkgProp?.id ?? "");
    const [selectedDateId, setSelectedDateId] = useState("");
    const [passportFields, setPassportFields] = useState<PassportExtractedFields | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<"bank_transfer" | "paystack">(
        paystackEnabled ? "paystack" : "bank_transfer"
    );
    const [adminPaymentMethod, setAdminPaymentMethod] = useState<"bank_transfer" | "cash" | "paystack">("bank_transfer");
    const [transferProofUrl, setTransferProofUrl] = useState("");
    const [proofUploading, setProofUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bookingRef, setBookingRef] = useState("");
    const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);
    const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);
    const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);

    // ── Packages list (admin picks from dropdown) ─────────────────────────────────
    const { data: allPackages = [] } = useQuery({
        queryKey: ["packages-active"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("packages")
                .select("*, package_dates(*), package_accommodations(*)")
                .eq("status", "active")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data as any[];
        },
        enabled: isAdmin && !pkgProp,
    });

    const pkg = pkgProp ?? allPackages.find((p) => p.id === pkgId);

    // ── Pricing ────────────────────────────────────────────────────────────────────
    const pkgPrice = Number(pkg?.price ?? 0);
    const commissionRate = Number(agent?.commission_rate ?? 0);
    const commissionType = agent?.commission_type ?? "percentage";
    const pkgDiscount = Number(pkg?.agent_discount ?? 0);

    let effectivePrice = pkgPrice;
    if (mode === "agent" && agent) {
        if (commissionType === "fixed") effectivePrice = Math.max(0, pkgPrice - commissionRate);
        else if (commissionRate > 0) effectivePrice = Math.max(0, pkgPrice - (pkgPrice * commissionRate / 100));
        else effectivePrice = Math.max(0, pkgPrice - pkgDiscount);
    }
    const savings = pkgPrice - effectivePrice;

    // ── Bank accounts ──────────────────────────────────────────────────────────────
    const { data: bankAccounts = [] } = useQuery({
        queryKey: ["bank-accounts"],
        queryFn: async () => {
            const { data, error } = await supabase.from("bank_accounts" as any).select("*").eq("is_active", true).order("created_at");
            if (error) return [];
            return data as any[];
        },
    });

    // ── Helpers ────────────────────────────────────────────────────────────────────
    const handleProofUpload = async (file: File) => {
        setProofUploading(true);
        try {
            const ext = file.name.split(".").pop();
            const path = `proofs/${mode}/${user?.id ?? "anon"}/${Date.now()}.${ext}`;
            const { error } = await supabase.storage.from("booking-attachments").upload(path, file, { upsert: true });
            if (error) throw error;
            const { data: urlData } = supabase.storage.from("booking-attachments").getPublicUrl(path);
            setTransferProofUrl(urlData.publicUrl);
            toast.success("Receipt uploaded!");
        } catch (err: any) { toast.error("Upload failed: " + err.message); }
        finally { setProofUploading(false); }
    };

    const uploadPassportPhoto = async (file: File): Promise<string | null> => {
        try {
            const fileName = `${user?.id ?? "admin"}/${Date.now()}_passport.jpg`;
            const { data: up, error } = await supabase.storage.from("passport-photos").upload(fileName, file);
            if (error) throw error;
            return up.path;
        } catch { return null; }
    };

    /** Upload a data URL (face crop) as a JPG and return the public URL */
    const uploadDataUrlAsPhoto = async (dataUrl: string): Promise<string | null> => {
        try {
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            const file = new File([blob], "profile.jpg", { type: "image/jpeg" });
            const path = `${user?.id ?? "admin"}/${Date.now()}_profile.jpg`;
            const { error } = await supabase.storage.from("passport-photos").upload(path, file, { upsert: true });
            if (error) throw error;
            const { data } = supabase.storage.from("passport-photos").getPublicUrl(path);
            return data.publicUrl;
        } catch { return null; }
    };

    // ── Submit ─────────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!user || !pkg || !selectedDateId || !passportFields) return;
        setIsSubmitting(true);
        try {
            let passportUrl: string | null = null;
            if (passportFields.rawFile.size > 0) {
                passportUrl = await uploadPassportPhoto(passportFields.rawFile);
            }

            // Upload face crop or manual photo as profile_photo_url
            let uploadedProfileUrl: string | null = profilePhotoUrl;
            if (!uploadedProfileUrl) {
                if (passportFields.profilePicDataUrl) {
                    uploadedProfileUrl = await uploadDataUrlAsPhoto(passportFields.profilePicDataUrl);
                    setProfilePhotoUrl(uploadedProfileUrl);
                } else if (passportFields.manualPhotoFile && passportFields.manualPhotoFile.size > 0) {
                    const path = await uploadPassportPhoto(passportFields.manualPhotoFile);
                    if (path) {
                        const { data } = supabase.storage.from("passport-photos").getPublicUrl(path);
                        uploadedProfileUrl = data.publicUrl;
                        setProfilePhotoUrl(uploadedProfileUrl);
                    }
                }
            }

            // Bookings payload — only passport core fields + source tracking
            const bookingPayload: any = {
                id: pendingBookingId || undefined,
                user_id: user.id,
                package_id: pkg.id,
                package_date_id: selectedDateId,
                full_name: passportFields.fullName,
                passport_number: passportFields.passportNumber,
                passport_expiry: passportFields.passportExpiry || null,
                date_of_birth: passportFields.dateOfBirth || null,
                nationality: passportFields.nationality || null,
                gender: passportFields.gender,
                profile_photo_url: uploadedProfileUrl || null,
                booking_source: mode,   // 'user' | 'agent' | 'admin'
                payment_method_preference: isAdmin ? adminPaymentMethod : paymentMethod,
                status: "pending",
                ...(mode === "agent" && agent ? { agent_id: agent.id } : {}),
            };

            const { data: bookingData, error: bookingError } = await supabase
                .from("bookings")
                .upsert(bookingPayload as any)
                .select()
                .single();
            if (bookingError) throw bookingError;
            setPendingBookingId(bookingData.id);

            if (passportUrl) {
                await supabase.from("documents").insert({
                    user_id: user.id, booking_id: bookingData.id,
                    file_url: passportUrl, file_name: passportFields.rawFile.name || "passport.jpg", type: "passport",
                });
            }

            // Admin: no payment step
            if (isAdmin) {
                setBookingRef(bookingData.reference || bookingData.id.slice(0, 8));
                setStep(4);
                toast.success("Pilgrim registered!");
                onSuccess?.(bookingData.reference || bookingData.id.slice(0, 8), bookingData.id);
                return;
            }

            // Payment record
            const { data: paymentData, error: paymentError } = await supabase
                .from("payments")
                .upsert({
                    id: pendingPaymentId || undefined,
                    booking_id: bookingData.id,
                    amount: effectivePrice,
                    method: paymentMethod,
                    status: "pending",
                    proof_of_payment_url: paymentMethod === "bank_transfer" && transferProofUrl ? transferProofUrl : null,
                })
                .select().single();
            if (paymentError) throw paymentError;
            if (paymentData) setPendingPaymentId(paymentData.id);

            // Paystack
            if (paymentMethod === "paystack") {
                await supabase.auth.refreshSession();
                const { data: ps, error: psErr } = await supabase.functions.invoke("create-paystack-checkout", {
                    body: { email: user.email, bookingId: bookingData.id },
                });
                if (psErr || !ps?.access_code) throw new Error("Failed to initialize Paystack payment.");
                if (!(window as any).PaystackPop) {
                    await new Promise((res) => {
                        const s = document.createElement("script");
                        s.src = "https://js.paystack.co/v1/inline.js"; s.async = true; s.onload = res;
                        document.body.appendChild(s);
                    });
                }
                const pk = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
                if (!pk) { toast.error("Payment config error."); return; }
                (window as any).PaystackPop.setup({
                    key: pk, email: user.email || "",
                    amount: Math.round((ps.amount || effectivePrice) * 100),
                    access_code: ps.access_code,
                    callback: (r: any) => navigate(`/payment/callback?reference=${r.reference}`),
                    onClose: () => toast.info("Payment cancelled."),
                }).openIframe();
                return;
            }

            // Bank transfer success
            setBookingRef(bookingData.reference || bookingData.id.slice(0, 8));
            setStep(4);
            toast.success("Booking submitted!");
            onSuccess?.(bookingData.reference || bookingData.id.slice(0, 8), bookingData.id);
        } catch (err: any) {
            toast.error(err.message || "Failed to create booking.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────────
    const totalSteps = 3;

    return (
        <div className="max-w-xl mx-auto space-y-2">
            {/* Back nav */}
            {backUrl && step < 4 && (
                <button
                    onClick={() => step > 1 ? setStep((s) => s - 1) : navigate(backUrl)}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {step > 1 ? "Back" : "Back to Packages"}
                </button>
            )}

            {/* Step counter text */}
            {step < 4 && (
                <p className="text-xs text-muted-foreground font-medium">
                    Step {step} of {totalSteps}
                </p>
            )}

            {/* Step progress bar */}
            {step < 4 && <StepBar current={step} isAdmin={isAdmin} />}

            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.18 }}
                >

                    {/* ══════════════════════════════════════════════════
              STEP 1 — Package & Date
          ══════════════════════════════════════════════════ */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-bold">Package & Date</h2>
                                <p className="text-sm text-muted-foreground mt-0.5">Select your Umrah package and travel date</p>
                            </div>

                            <div className="space-y-4">
                                {/* Admin package picker */}
                                {isAdmin && !pkgProp && (
                                    <div>
                                        <FieldLabel required>Package</FieldLabel>
                                        <Select value={pkgId} onValueChange={(v) => { setPkgId(v); setSelectedDateId(""); }}>
                                            <SelectTrigger className={inset}>
                                                <SelectValue placeholder="Choose a package…" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {allPackages.map((p: any) => (
                                                    <SelectItem key={p.id} value={p.id}>
                                                        {p.name} — {formatPrice(Number(p.price))}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Package summary for user/agent (pkg is pre-set from URL) */}
                                {!isAdmin && pkg && (
                                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-1 shadow-[inset_0_1px_4px_rgba(0,0,0,0.05)]">
                                        <p className="font-semibold">{pkg.name}</p>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className="text-xl font-bold text-primary">{formatPrice(effectivePrice)}</span>
                                            {mode === "agent" && savings > 0 && (
                                                <>
                                                    <span className="text-sm text-muted-foreground line-through">{formatPrice(pkgPrice)}</span>
                                                    <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                                                        <CheckCircle2 className="h-3 w-3" /> Save {formatPrice(savings)}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">{pkg.duration} · {pkg.type}</p>
                                    </div>
                                )}

                                {/* Date dropdown — shown when package is selected */}
                                {pkg && (
                                    <div>
                                        <FieldLabel required>Travel Date</FieldLabel>
                                        <Select value={selectedDateId} onValueChange={setSelectedDateId}>
                                            <SelectTrigger className={inset}>
                                                <SelectValue placeholder="Choose a departure date…" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(pkg.package_dates ?? []).length === 0 ? (
                                                    <div className="px-3 py-2 text-sm text-muted-foreground">No dates available</div>
                                                ) : (
                                                    (pkg.package_dates ?? []).map((d: any) => (
                                                        <SelectItem key={d.id} value={d.id}>
                                                            {format(new Date(d.outbound), "dd MMM yyyy")} → {format(new Date(d.return_date), "dd MMM yyyy")}
                                                            {d.airline ? ` · ${d.airline}` : ""}
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>

                            <Button
                                className="w-full h-11 rounded-xl font-semibold"
                                disabled={!selectedDateId || (isAdmin && !pkgId)}
                                onClick={() => setStep(2)}
                            >
                                Continue →
                            </Button>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════
              STEP 2 — Pilgrim Details (passport only)
          ══════════════════════════════════════════════════ */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-bold">Pilgrim Details</h2>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    Scan passport for instant auto-fill — or enter manually below
                                </p>
                            </div>

                            {/* AI Scanner widget */}
                            <PassportScannerWidget onExtracted={(f) => setPassportFields(f)} />

                            {/* Editable extracted fields — always shown once fields exist */}
                            {passportFields && (
                                <div className="rounded-xl border border-border bg-background shadow-[inset_0_2px_8px_rgba(0,0,0,0.05)] p-5 space-y-4">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                        Verify Details — all fields editable
                                    </p>

                                    {/* Row 1: Full name */}
                                    <div>
                                        <FieldLabel required>Full Name (as on passport)</FieldLabel>
                                        <input className={inset} value={passportFields.fullName}
                                            placeholder="e.g. Fatima Abubakar Musa"
                                            onChange={(e) => setPassportFields((f) => f ? { ...f, fullName: e.target.value } : f)} />
                                    </div>

                                    {/* Row 2: Passport no + Nationality */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <FieldLabel required>Passport Number</FieldLabel>
                                            <input className={`${inset} uppercase`} value={passportFields.passportNumber}
                                                placeholder="A12345678"
                                                onChange={(e) => setPassportFields((f) => f ? { ...f, passportNumber: e.target.value.toUpperCase() } : f)} />
                                        </div>
                                        <div>
                                            <FieldLabel>Nationality</FieldLabel>
                                            <input className={inset} value={passportFields.nationality}
                                                placeholder="e.g. Nigerian"
                                                onChange={(e) => setPassportFields((f) => f ? { ...f, nationality: e.target.value } : f)} />
                                        </div>
                                    </div>

                                    {/* Row 3: DOB + Expiry */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <FieldLabel>Date of Birth</FieldLabel>
                                            <input type="date" className={inset} value={passportFields.dateOfBirth}
                                                onChange={(e) => setPassportFields((f) => f ? { ...f, dateOfBirth: e.target.value } : f)} />
                                        </div>
                                        <div>
                                            <FieldLabel required>Passport Expiry</FieldLabel>
                                            <input type="date" className={inset} value={passportFields.passportExpiry}
                                                onChange={(e) => setPassportFields((f) => f ? { ...f, passportExpiry: e.target.value } : f)} />
                                        </div>
                                    </div>

                                    {/* Row 4: Gender */}
                                    <div>
                                        <FieldLabel>Gender</FieldLabel>
                                        <select className={inset} value={passportFields.gender}
                                            onChange={(e) => setPassportFields((f) => f ? { ...f, gender: e.target.value as any } : f)}>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                        </select>
                                    </div>

                                    {/* Visa provider note (read-only info box) */}
                                    <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2.5">
                                        <span className="text-primary mt-0.5">ℹ</span>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            <strong className="text-foreground">Visa provider</strong> will be assigned by the admin
                                            after the visa is approved — no action needed here.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <Button
                                className="w-full h-11 rounded-xl font-semibold"
                                disabled={!passportFields?.passportNumber || !passportFields?.passportExpiry}
                                onClick={() => {
                                    if (!passportFields?.passportNumber) { toast.error("Passport number required"); return; }
                                    if (!passportFields?.passportExpiry) { toast.error("Passport expiry required"); return; }
                                    setStep(3);
                                }}
                            >
                                Continue to {isAdmin ? "Confirm" : "Payment"} →
                            </Button>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════
              STEP 3 — Payment  (user / agent only)
          ══════════════════════════════════════════════════ */}
                    {/* ══════════════════════════════════════════════════
              STEP 3 — Admin: Confirm | User/Agent: Payment
          ══════════════════════════════════════════════════ */}
                    {step === 3 && isAdmin && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-bold">Confirm & Record Payment</h2>
                                <p className="text-sm text-muted-foreground mt-0.5">Select the payment method collected from this pilgrim</p>
                            </div>

                            {/* Pilgrim summary card */}
                            <div className="rounded-xl border border-border bg-muted/20 shadow-[inset_0_2px_8px_rgba(0,0,0,0.05)] p-4 flex items-center gap-4">
                                {passportFields?.profilePicDataUrl ? (
                                    <img src={passportFields.profilePicDataUrl} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-border shrink-0" />
                                ) : (
                                    <div className="w-14 h-14 rounded-full bg-muted border-2 border-border shrink-0 flex items-center justify-center">
                                        <span className="text-lg font-bold text-muted-foreground">{passportFields?.fullName?.[0] ?? "?"}</span>
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="font-bold truncate">{passportFields?.fullName}</p>
                                    <p className="text-xs text-muted-foreground font-mono">{passportFields?.passportNumber}</p>
                                    <p className="text-xs text-muted-foreground">{pkg?.name} · <span className="font-semibold text-primary">{formatPrice(pkgPrice)}</span></p>
                                </div>
                            </div>

                            {/* Payment method selector */}
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Payment Method Received</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {(["bank_transfer", "cash", "paystack"] as const).map((m) => (
                                        <button key={m}
                                            onClick={() => setAdminPaymentMethod(m)}
                                            className={[
                                                "p-3 rounded-xl border-2 text-center transition-all",
                                                adminPaymentMethod === m
                                                    ? "border-primary bg-primary/5 shadow-[inset_0_1px_6px_rgba(0,0,0,0.06)]"
                                                    : "border-border hover:border-primary/40",
                                            ].join(" ")}
                                        >
                                            <p className="text-xs font-bold">
                                                {m === "bank_transfer" ? "Bank Transfer" : m === "paystack" ? "Card / Online" : "Cash"}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <Button
                                className="w-full h-11 rounded-xl font-semibold"
                                disabled={isSubmitting}
                                onClick={handleSubmit}
                            >
                                {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Registering…</> : "Register Pilgrim →"}
                            </Button>
                        </div>
                    )}

                    {step === 3 && !isAdmin && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-bold">Payment</h2>
                                <p className="text-sm text-muted-foreground mt-0.5">Complete your booking payment</p>
                            </div>

                            {/* Summary */}
                            <div className="rounded-xl border border-border bg-muted/20 shadow-[inset_0_1px_4px_rgba(0,0,0,0.05)] p-4 flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="font-semibold text-sm truncate">{pkg?.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{passportFields?.fullName}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-2xl font-bold text-primary">{formatPrice(effectivePrice)}</p>
                                    {mode === "agent" && savings > 0 && (
                                        <p className="text-[10px] font-medium text-emerald-600">Save {formatPrice(savings)}</p>
                                    )}
                                </div>
                            </div>

                            {/* Method toggle */}
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                                    Payment Method
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    {(["bank_transfer", "paystack"] as const).map((m) => {
                                        const sel = paymentMethod === m;
                                        const dis = m === "paystack" && !paystackEnabled;
                                        return (
                                            <button key={m} disabled={dis}
                                                onClick={() => { setPaymentMethod(m); if (m === "paystack") setTransferProofUrl(""); }}
                                                className={[
                                                    "p-4 rounded-xl border-2 text-left transition-all",
                                                    sel ? "border-primary bg-primary/5 shadow-[inset_0_1px_6px_rgba(0,0,0,0.06)]" : "border-border hover:border-primary/40",
                                                    dis ? "opacity-40 cursor-not-allowed" : "",
                                                ].join(" ")}
                                            >
                                                <p className="text-sm font-bold">{m === "bank_transfer" ? "Bank Transfer" : "Card / Online"}</p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                                    {m === "bank_transfer" ? "Upload proof of payment" : "Instant via Paystack"}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Bank transfer panel */}
                            {paymentMethod === "bank_transfer" && (
                                <div className="rounded-xl border border-amber-300/70 bg-amber-50/70 dark:bg-amber-900/10 p-4 space-y-3">
                                    <p className="text-xs font-semibold text-amber-700">
                                        Transfer {formatPrice(effectivePrice)} to the account below, then upload your receipt
                                    </p>
                                    <div className="space-y-2">
                                        {bankAccounts.length === 0 ? (
                                            <p className="text-xs text-muted-foreground">Contact our office for bank details.</p>
                                        ) : bankAccounts.map((acct: any) => (
                                            <div key={acct.id} className="rounded-lg border border-amber-200 bg-white dark:bg-background p-3 text-xs space-y-0.5">
                                                <p className="font-bold">{acct.bank_name}</p>
                                                <p className="text-muted-foreground">Account Name: <span className="font-medium text-foreground">{acct.account_name}</span></p>
                                                <p className="text-muted-foreground">Account No: <span className="font-mono font-bold text-primary tracking-wider">{acct.account_number}</span></p>
                                                {acct.sort_code && <p className="text-muted-foreground">Sort Code: {acct.sort_code}</p>}
                                            </div>
                                        ))}
                                    </div>
                                    {transferProofUrl ? (
                                        <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                                            <CheckCircle2 className="h-4 w-4" />
                                            <a href={transferProofUrl} target="_blank" rel="noopener noreferrer" className="underline truncate max-w-[180px]">
                                                Receipt uploaded ✓
                                            </a>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer">
                                            <input type="file" accept="image/*,.pdf" className="hidden"
                                                onChange={(e) => e.target.files?.[0] && handleProofUpload(e.target.files[0])} />
                                            <span className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input bg-background text-xs font-medium hover:bg-muted transition-colors ${proofUploading ? "opacity-50 pointer-events-none" : ""}`}>
                                                {proofUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                                                {proofUploading ? "Uploading…" : "Upload Receipt / Teller"}
                                            </span>
                                        </label>
                                    )}
                                </div>
                            )}

                            <Button
                                className="w-full h-11 rounded-xl font-semibold"
                                disabled={isSubmitting || (paymentMethod === "bank_transfer" && !transferProofUrl)}
                                onClick={handleSubmit}
                            >
                                {isSubmitting
                                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing…</>
                                    : paymentMethod === "paystack" ? "Proceed to Payment →" : "Confirm Booking →"}
                            </Button>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════
              STEP 4 — Success
          ══════════════════════════════════════════════════ */}
                    {step === 4 && (
                        <div className="text-center py-10 space-y-5">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto ring-8 ring-emerald-100/50">
                                <CheckCircle className="h-9 w-9 text-emerald-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">
                                    {isAdmin ? "Pilgrim Registered!" : paymentMethod === "bank_transfer" ? "Booking Submitted!" : "Booking Created!"}
                                </h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Reference:{" "}
                                    <span className="font-mono font-bold text-foreground bg-muted px-2 py-0.5 rounded-md text-sm">
                                        {bookingRef}
                                    </span>
                                </p>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    Pilgrim: <strong>{passportFields?.fullName}</strong>
                                </p>
                            </div>
                            {paymentMethod === "bank_transfer" && transferProofUrl && (
                                <div className="inline-flex items-center gap-2 text-xs text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Payment Proof Submitted
                                </div>
                            )}
                            <div className="flex gap-3 justify-center pt-1">
                                {backUrl && (
                                    <Button variant="outline" className="rounded-xl" onClick={() => navigate(backUrl)}>
                                        Back to Packages
                                    </Button>
                                )}
                                <Button className="rounded-xl" onClick={() => navigate(
                                    isAdmin ? "/admin/pilgrims" :
                                        mode === "agent" ? "/agent/bookings" :
                                            "/dashboard/bookings"
                                )}>
                                    View Bookings
                                </Button>
                            </div>
                        </div>
                    )}

                </motion.div>
            </AnimatePresence>
        </div>
    );
}
