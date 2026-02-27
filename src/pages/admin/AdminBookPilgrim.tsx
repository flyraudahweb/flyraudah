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
import { AlertCircle, User, Plane, CreditCard, CheckCircle, Upload, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { useSystemFieldConfig, useBookingFormFields } from "@/hooks/useBookingFormFields";
import CustomFieldsSection from "@/components/bookings/CustomFieldsSection";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const pilgrimSchema = z.object({
    fullName: z.string().optional().default(""),
    dateOfBirth: z.string().optional().default(""),
    gender: z.enum(["male", "female"]).default("male"),
    maritalStatus: z.enum(["single", "married", "widowed", "divorced"]).default("single"),
    nationality: z.string().optional().default(""),
    placeOfBirth: z.string().optional().default(""),
    occupation: z.string().optional().default(""),
    phone: z.string().optional().default(""),
    address: z.string().optional().default(""),
    fathersName: z.string().optional().default(""),
    mothersName: z.string().optional().default(""),
    passportNumber: z.string().regex(/^[A-Z0-9]{5,20}$/, "Invalid passport number"),
    passportExpiry: z.string().min(1, "Required"),
    mahramName: z.string().optional(),
    mahramRelationship: z.string().optional(),
    mahramPassport: z.string().optional(),
    meningitisVaccineDate: z.string().optional(),
    previousUmrah: z.boolean(),
    previousUmrahYear: z.string().optional(),
});

const travelSchema = z.object({
    departureCity: z.string().optional().default(""),
    roomPreference: z.string().optional(),
    specialRequests: z.string().optional(),
    emergencyContactName: z.string().optional().default(""),
    emergencyContactPhone: z.string().optional().default(""),
    emergencyContactRelationship: z.string().optional().default(""),
});

type PilgrimForm = z.infer<typeof pilgrimSchema>;
type TravelForm = z.infer<typeof travelSchema>;

const STEPS = [
    { label: "Package", icon: CheckCircle },
    { label: "Pilgrim Info", icon: User },
    { label: "Visa & Travel", icon: Plane },
    { label: "Payment", icon: CreditCard },
];

const AdminBookPilgrim = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [step, setStep] = useState(1);
    const [selectedPackageId, setSelectedPackageId] = useState("");
    const [selectedDateId, setSelectedDateId] = useState("");

    const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank_transfer">("cash");
    const [markAsVerified, setMarkAsVerified] = useState(true);
    const [passportFile, setPassportFile] = useState<File | null>(null);
    const [vaccineFile, setVaccineFile] = useState<File | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bookingReference, setBookingReference] = useState("");
    const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);
    const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);
    const [hasPreviousUmrah, setHasPreviousUmrah] = useState(false);
    const [isFemale, setIsFemale] = useState(false);

    const { data: customFields = [] } = useBookingFormFields("admin");
    const [customData, setCustomData] = useState<Record<string, string>>({});
    const [customUploading, setCustomUploading] = useState<Record<string, boolean>>({});
    const handleCustomChange = (key: string, value: string) => setCustomData((p) => ({ ...p, [key]: value }));
    const { get: sysField } = useSystemFieldConfig();

    const pilgrimForm = useForm<PilgrimForm>({
        resolver: zodResolver(pilgrimSchema),
        defaultValues: { gender: "male", maritalStatus: "single", previousUmrah: false },
    });

    const travelForm = useForm<TravelForm>({
        resolver: zodResolver(travelSchema),
        defaultValues: {},
    });

    const { data: packages = [], isLoading: pkgLoading } = useQuery({
        queryKey: ["admin-packages-active"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("packages")
                .select("*, package_accommodations(*), package_dates(*)")
                .in("status", ["active", "draft"])
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data || [];
        },
    });

    const pkg = packages.find((p: any) => p.id === selectedPackageId);

    const onSubmitBooking = async () => {
        if (!user || !pkg || !selectedDateId || isSubmitting) return;
        setIsSubmitting(true);

        try {
            const pData = pilgrimForm.getValues();
            const tData = travelForm.getValues();

            let passportUrl: string | null = null;
            if (passportFile) {
                const fileName = `${user.id}/${Date.now()}_admin_passport.jpg`;
                const { data: up, error: upErr } = await supabase.storage
                    .from("passport-photos")
                    .upload(fileName, passportFile);
                if (upErr) throw upErr;
                passportUrl = up.path;
            }

            let vaccineUrl: string | null = null;
            if (vaccineFile) {
                const fileName = `${user.id}/${Date.now()}_admin_vaccine.pdf`;
                const { data: vUp, error: vErr } = await supabase.storage
                    .from("passport-photos")
                    .upload(fileName, vaccineFile);
                if (!vErr) vaccineUrl = vUp.path;
            }

            const { data: bookingData, error: bookingError } = await supabase
                .from("bookings")
                .upsert({
                    id: pendingBookingId || undefined,
                    user_id: user.id, // Linked to the admin creating it
                    package_id: pkg.id,
                    package_date_id: selectedDateId,
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
                    passport_number: pData.passportNumber,
                    passport_expiry: pData.passportExpiry,
                    mahram_name: pData.mahramName || null,
                    mahram_relationship: pData.mahramRelationship || null,
                    mahram_passport: pData.mahramPassport || null,
                    meningitis_vaccine_date: pData.meningitisVaccineDate || null,
                    previous_umrah: pData.previousUmrah,
                    previous_umrah_year: pData.previousUmrahYear ? parseInt(pData.previousUmrahYear) : null,
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

            const safePrice = Number(pkg.price) || 0;

            const { data: paymentData, error: paymentError } = await supabase
                .from("payments")
                .upsert({
                    id: pendingPaymentId || undefined,
                    booking_id: bookingData.id,
                    amount: safePrice,
                    method: paymentMethod,
                    status: markAsVerified ? "verified" : "pending",
                    verified_by: markAsVerified ? user.id : null,
                    verified_at: markAsVerified ? new Date().toISOString() : null,
                })
                .select()
                .single();

            if (paymentError) throw paymentError;
            if (paymentData) setPendingPaymentId(paymentData.id);

            // Once verified physically, you may also want to set booking to confirmed.
            // E.g. trigger auto-confirms or do it here explicitly.
            if (markAsVerified) {
                await supabase.from("bookings").update({ status: 'confirmed' }).eq('id', bookingData.id);
            }

            setBookingReference(bookingData.reference || bookingData.id.slice(0, 8));
            setStep(5);
            toast.success("Direct Registration completed!");
        } catch (error: any) {
            console.error("Booking error:", error);
            toast.error(error.message || "Failed to create booking.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (pkgLoading) return <div className="p-8"><Skeleton className="h-96" /></div>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-2xl font-bold">Register Pilgrim (Direct)</h1>
                    <p className="text-sm text-muted-foreground">Admin/Staff manual booking creation</p>
                </div>
                <Button variant="outline" onClick={() => navigate("/admin/pilgrims")} className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> Back to Pilgrims
                </Button>
            </div>

            <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                    {STEPS.map((s, i) => {
                        const num = i + 1;
                        const active = step === num;
                        const done = step > num;
                        return (
                            <div key={num} className="flex flex-col items-center gap-1 flex-1">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${done ? "bg-primary text-primary-foreground" : active ? "bg-primary text-primary-foreground ring-4 ring-primary/20" : "bg-muted text-muted-foreground"}`}>
                                    {done ? "✓" : num}
                                </div>
                                <span className="text-[10px] text-muted-foreground hidden sm:block">{s.label}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key={step}>
                {step === 1 && (
                    <Card>
                        <CardHeader><CardTitle>Select Package</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <Label>Choose Package</Label>
                                <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
                                    <SelectTrigger><SelectValue placeholder="Select a package..." /></SelectTrigger>
                                    <SelectContent>
                                        {packages.map((p: any) => (
                                            <SelectItem key={p.id} value={p.id}>{p.name} (₦{Number(p.price).toLocaleString()})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {pkg && (
                                <div>
                                    <Label>Travel Date *</Label>
                                    <Select value={selectedDateId} onValueChange={setSelectedDateId}>
                                        <SelectTrigger><SelectValue placeholder="Select date..." /></SelectTrigger>
                                        <SelectContent>
                                            {pkg.package_dates?.map((d: any) => (
                                                <SelectItem key={d.id} value={d.id}>
                                                    {d.outbound} → {d.return_date} {d.airline ? `(✈ ${d.airline})` : ""}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <Button onClick={() => setStep(2)} disabled={!selectedPackageId || !selectedDateId} className="w-full">
                                Continue
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {step === 2 && (
                    <Card>
                        <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
                        <CardContent className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <Label>Full Name *</Label>
                                    <Input {...pilgrimForm.register("fullName")} placeholder="e.g. Fatima Abubakar" />
                                    {pilgrimForm.formState.errors.fullName && <p className="text-xs text-destructive">{pilgrimForm.formState.errors.fullName.message}</p>}
                                </div>
                                <div>
                                    <Label>Phone *</Label>
                                    <Input {...pilgrimForm.register("phone")} placeholder="+234..." />
                                </div>
                                <div>
                                    <Label>Gender *</Label>
                                    <select {...pilgrimForm.register("gender")} onChange={(e) => { pilgrimForm.setValue("gender", e.target.value as "male" | "female"); setIsFemale(e.target.value === "female"); }} className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm">
                                        <option value="male">Male</option><option value="female">Female</option>
                                    </select>
                                </div>
                                <div>
                                    <Label>Nationality</Label>
                                    <Input {...pilgrimForm.register("nationality")} placeholder="e.g. Nigerian" />
                                </div>
                                <div>
                                    <Label>Date of Birth</Label>
                                    <Input type="date" {...pilgrimForm.register("dateOfBirth")} />
                                </div>
                                <div>
                                    <Label>Passport Number *</Label>
                                    <Input {...pilgrimForm.register("passportNumber")} placeholder="A12345678" className="uppercase" />
                                    {pilgrimForm.formState.errors.passportNumber && <p className="text-xs text-destructive">{pilgrimForm.formState.errors.passportNumber.message}</p>}
                                </div>
                                <div>
                                    <Label>Passport Expiry *</Label>
                                    <Input type="date" {...pilgrimForm.register("passportExpiry")} />
                                    {pilgrimForm.formState.errors.passportExpiry && <p className="text-xs text-destructive">{pilgrimForm.formState.errors.passportExpiry.message}</p>}
                                </div>
                                <div>
                                    <Label>Passport Photo <span className="text-muted-foreground font-normal">(optional)</span></Label>
                                    <Input type="file" accept="image/*,.pdf" onChange={(e) => setPassportFile(e.target.files?.[0] || null)} />
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                                <Button onClick={async () => {
                                    const valid = await pilgrimForm.trigger(["fullName", "phone", "passportNumber", "passportExpiry"]);
                                    if (valid) setStep(3);
                                }} className="flex-1">Continue</Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {step === 3 && (
                    <Card>
                        <CardHeader><CardTitle>Visa & Travel Details</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label>Departure City</Label>
                                    <Select onValueChange={(v) => travelForm.setValue("departureCity", v)}>
                                        <SelectTrigger><SelectValue placeholder="Select city..." /></SelectTrigger>
                                        <SelectContent>
                                            {pkg?.departure_cities?.map((city: string) => <SelectItem key={city} value={city}>{city}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Room Preference</Label>
                                    <Input {...travelForm.register("roomPreference")} placeholder="e.g. Double, Quad" />
                                </div>
                                <div className="sm:col-span-2">
                                    <Label>Special Requests</Label>
                                    <textarea {...travelForm.register("specialRequests")} className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm" rows={2} />
                                </div>
                                <div className="sm:col-span-2">
                                    <Label>Vaccine Certificate <span className="text-muted-foreground font-normal">(optional)</span></Label>
                                    <Input type="file" accept="image/*,.pdf" onChange={(e) => setVaccineFile(e.target.files?.[0] || null)} />
                                </div>
                            </div>

                            {customFields.length > 0 && (
                                <div className="space-y-3 pt-2">
                                    <p className="text-sm font-medium">Extra Questions</p>
                                    <CustomFieldsSection fields={customFields} values={customData} onChange={handleCustomChange} uploading={customUploading} onUploadingChange={(key, val) => setCustomUploading((p) => ({ ...p, [key]: val }))} />
                                </div>
                            )}

                            <div className="flex gap-2 pt-4">
                                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
                                <Button onClick={() => setStep(4)} className="flex-1">Continue</Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {step === 4 && (
                    <Card>
                        <CardHeader><CardTitle>Payment & Finalize</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/50 p-4 rounded-lg space-y-1 text-sm border">
                                <p><span className="text-muted-foreground">Pilgrim:</span> <strong>{pilgrimForm.getValues().fullName}</strong></p>
                                <p><span className="text-muted-foreground">Package:</span> {pkg?.name}</p>
                                <p><span className="text-muted-foreground">Amount Due:</span> <strong className="text-primary text-lg">₦{Number(pkg?.price).toLocaleString()}</strong></p>
                            </div>

                            <div>
                                <Label>Payment Method</Label>
                                <div className="grid grid-cols-2 gap-3 mt-1">
                                    <button onClick={() => setPaymentMethod("cash")} className={`p-3 border rounded-xl text-left transition-all ${paymentMethod === "cash" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/50"}`}>
                                        <p className="text-sm font-bold">Cash</p>
                                        <p className="text-[10px] text-muted-foreground">Paid in office</p>
                                    </button>
                                    <button onClick={() => setPaymentMethod("bank_transfer")} className={`p-3 border rounded-xl text-left transition-all ${paymentMethod === "bank_transfer" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/50"}`}>
                                        <p className="text-sm font-bold">Bank Transfer</p>
                                        <p className="text-[10px] text-muted-foreground">Direct deposit</p>
                                    </button>
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="flex items-center gap-2 cursor-pointer bg-primary/5 border border-primary/20 p-3 rounded-lg">
                                    <input type="checkbox" checked={markAsVerified} onChange={(e) => setMarkAsVerified(e.target.checked)} className="h-4 w-4 rounded accent-primary text-primary" />
                                    <span className="text-sm font-semibold text-primary">Mark Payment as Verified & Confirm Booking Now</span>
                                </label>
                                <p className="text-xs text-muted-foreground mt-1 px-1">You are submitting this as an administrator on behalf of the pilgrim.</p>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button variant="outline" onClick={() => setStep(3)} className="flex-1">Back</Button>
                                <Button onClick={onSubmitBooking} disabled={isSubmitting} className="flex-1">
                                    {isSubmitting ? "Processing..." : "Submit Registration"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {step === 5 && (
                    <Card>
                        <CardContent className="py-12 text-center space-y-4">
                            <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
                            <h2 className="text-2xl font-bold">Registration Complete!</h2>
                            <p className="text-muted-foreground">Booking Ref: <span className="font-mono text-foreground font-bold">{bookingReference}</span></p>
                            <div className="flex gap-2 justify-center pt-4">
                                <Button variant="outline" onClick={() => navigate("/admin/pilgrims")}>View Pilgrims</Button>
                                <Button onClick={() => window.location.reload()}>New Registration</Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </motion.div>
        </div>
    );
};

export default AdminBookPilgrim;
