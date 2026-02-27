import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    X, User, Shield, PhoneCall, Heart, Star, Lock, Loader2, CheckCircle2,
    Package, FileText, Upload, Trash2, Plane
} from "lucide-react";
import { toast } from "sonner";

interface EditBookingModalProps {
    booking: any;
    onClose: () => void;
    adminMode?: boolean;
}

type TabKey = "personal" | "passport" | "emergency" | "mahram" | "special" | "package" | "visa_flight" | "documents";

const TABS: { key: TabKey; label: string; icon: any }[] = [
    { key: "personal", label: "Personal", icon: User },
    { key: "passport", label: "Travel", icon: Shield },
    { key: "visa_flight", label: "Visa/Flight", icon: Plane },
    { key: "emergency", label: "Emergency", icon: PhoneCall },
    { key: "mahram", label: "Mahram", icon: Heart },
    { key: "special", label: "Requests", icon: Star },
    { key: "package", label: "Package", icon: Package },
    { key: "documents", label: "Docs", icon: FileText },
];

// Fields allowed to edit on confirmed bookings
const CONFIRMED_EDITABLE = new Set([
    "phone", "address", "emergency_contact_name",
    "emergency_contact_phone", "emergency_contact_relationship",
    "special_requests",
    "package_id", "package_date_id", "documents",
    "visa_provider", "visa_document_url", "flight_number",
    "arrival_date", "departure_date", "visa_type"
]);

const EditBookingModal = ({ booking, onClose, adminMode = false }: EditBookingModalProps) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<TabKey>("personal");
    const [saved, setSaved] = useState(false);

    const isPending = adminMode || booking.status === "pending";
    const isConfirmed = !adminMode && booking.status === "confirmed";
    const isEditable = adminMode || booking.status === "pending" || booking.status === "confirmed";

    const { register, handleSubmit, watch, setValue, formState: { isDirty, dirtyFields } } = useForm({
        defaultValues: {
            full_name: booking.full_name || "",
            gender: booking.gender || "",
            date_of_birth: booking.date_of_birth || "",
            nationality: booking.nationality || "",
            place_of_birth: booking.place_of_birth || "",
            occupation: booking.occupation || "",
            marital_status: booking.marital_status || "",
            phone: booking.phone || "",
            address: booking.address || "",
            fathers_name: booking.fathers_name || "",
            mothers_name: booking.mothers_name || "",
            // Travel
            passport_number: booking.passport_number || "",
            passport_expiry: booking.passport_expiry || "",
            departure_city: booking.departure_city || "",
            room_preference: booking.room_preference || "",
            meningitis_vaccine_date: booking.meningitis_vaccine_date || "",
            previous_umrah: booking.previous_umrah ? "true" : "false",
            previous_umrah_year: booking.previous_umrah_year?.toString() || "",
            // Emergency
            emergency_contact_name: booking.emergency_contact_name || "",
            emergency_contact_phone: booking.emergency_contact_phone || "",
            emergency_contact_relationship: booking.emergency_contact_relationship || "",
            // Mahram
            mahram_name: booking.mahram_name || "",
            mahram_relationship: booking.mahram_relationship || "",
            mahram_passport: booking.mahram_passport || "",
            // Special
            special_requests: booking.special_requests || "",
            // Package & Dates
            package_id: booking.package_id || "",
            package_date_id: booking.package_date_id || "",
            // Visa & Flight
            visa_provider: booking.visa_provider || "",
            visa_document_url: booking.visa_document_url || "",
            flight_number: booking.flight_number || "",
            arrival_date: booking.arrival_date || "",
            departure_date: booking.departure_date || "",
            visa_type: booking.visa_type || "",
            // Staged documents for amendment
            documents: [] as any[],
        },
    });

    const gender = watch("gender");
    const packageId = watch("package_id");
    const stagedDocuments = watch("documents") || [];

    // Fetch packages
    const { data: packages = [] } = useQuery({
        queryKey: ["packages-minimal"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("packages")
                .select("id, name")
                .eq("status", "active");
            if (error) throw error;
            return data;
        },
    });

    // Fetch dates for selected package
    const { data: packageDates = [] } = useQuery({
        queryKey: ["package-dates-minimal", packageId],
        queryFn: async () => {
            if (!packageId) return [];
            const { data, error } = await supabase
                .from("package_dates")
                .select("id, outbound")
                .eq("package_id", packageId);
            if (error) throw error;
            return data;
        },
        enabled: !!packageId,
    });

    // Fetch visa providers
    const { data: visaProviders = [] } = useQuery({
        queryKey: ["visa-providers-active"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("visa_providers")
                .select("name")
                .eq("is_active", true);
            if (error) throw error;
            return data;
        },
    });

    const isFieldEditable = (field: string) => {
        if (isPending) return true;
        if (isConfirmed) return CONFIRMED_EDITABLE.has(field);
        return false;
    };

    const { mutate: saveChanges, isPending: isSaving } = useMutation({
        mutationFn: async (formData: any) => {
            if (isPending) {
                // Sanitize before PATCH: Postgres rejects "" for integer/boolean columns
                const payload: Record<string, any> = {};
                for (const [key, val] of Object.entries(formData)) {
                    if (key === "previous_umrah_year") {
                        payload[key] = val !== "" && val != null ? Number(val) : null;
                    } else if (key === "previous_umrah") {
                        payload[key] = val === "true";
                    } else if (key === "documents") {
                        // Skip documents in regular update
                    } else {
                        payload[key] = val === "" ? null : val;
                    }
                }
                // Admin can update any booking; user can only update their own
                let query = supabase
                    .from("bookings")
                    .update({ ...payload, updated_at: new Date().toISOString() })
                    .eq("id", booking.id);
                if (!adminMode) query = query.eq("user_id", user!.id);
                const { error } = await query;
                if (error) throw error;
            } else if (isConfirmed) {
                // Amendment request for confirmed bookings
                const changedFields: Record<string, any> = {};
                for (const key of Object.keys(dirtyFields)) {
                    if (CONFIRMED_EDITABLE.has(key)) {
                        changedFields[key] = (formData as any)[key];
                    }
                }

                if (Object.keys(changedFields).length === 0) {
                    throw new Error("No changes detected.");
                }

                const { error } = await supabase
                    .from("booking_amendment_requests")
                    .insert({
                        booking_id: booking.id,
                        user_id: user!.id,
                        requested_changes: changedFields,
                    });
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["user-bookings-full"] });
            queryClient.invalidateQueries({ queryKey: ["admin-all-bookings"] });
            queryClient.invalidateQueries({ queryKey: ["admin-amendment-requests"] });
            setSaved(true);
            if (isPending) {
                toast.success("Booking updated successfully!");
            } else {
                toast.success("Amendment request submitted! Admin will review shortly.");
            }
            setTimeout(onClose, 1500);
        },
        onError: (err: any) => {
            toast.error(err.message || "Failed to save changes.");
        },
    });

    const onSubmit = (data: any) => {
        if (!isDirty) {
            toast.info("No changes to save.");
            return;
        }
        saveChanges(data);
    };

    const fieldProps = (name: string, extraProps?: object) => ({
        ...register(name as any),
        disabled: !isFieldEditable(name) || isSaving,
        className: `h-9 text-sm ${!isFieldEditable(name) ? "opacity-50 cursor-not-allowed bg-muted" : ""}`,
        ...extraProps,
    });

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-2xl bg-background rounded-2xl shadow-2xl border border-border/60 max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/60 shrink-0">
                    <div>
                        <h2 className="font-heading text-lg font-bold text-foreground">Edit Booking</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Ref: {booking.reference || booking.id.slice(0, 8).toUpperCase()}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {isConfirmed && (
                            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                                Limited edit — confirmed booking
                            </Badge>
                        )}
                        <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
                            <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-5 pt-3 pb-1 overflow-x-auto shrink-0">
                    {TABS.map(({ key, label, icon: Icon }) => {
                        const skip = key === "mahram" && gender !== "female";
                        if (skip) return null;
                        return (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${activeTab === key
                                    ? "bg-secondary/20 text-secondary border border-secondary/30"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                    }`}
                            >
                                <Icon className="h-3 w-3" />
                                {label}
                            </button>
                        );
                    })}
                </div>

                {/* Form body */}
                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

                    {/* PERSONAL TAB */}
                    {activeTab === "personal" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Full Name" locked={!isFieldEditable("full_name")}>
                                <Input {...fieldProps("full_name")} placeholder="As on passport" />
                            </Field>
                            <Field label="Gender" locked={!isFieldEditable("gender")}>
                                <Select
                                    disabled={!isFieldEditable("gender") || isSaving}
                                    value={watch("gender")}
                                    onValueChange={(v) => setValue("gender", v, { shouldDirty: true })}
                                >
                                    <SelectTrigger className={`h-9 text-sm ${!isFieldEditable("gender") ? "opacity-50 cursor-not-allowed bg-muted" : ""}`}>
                                        <SelectValue placeholder="Select gender" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="male">Male</SelectItem>
                                        <SelectItem value="female">Female</SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label="Date of Birth" locked={!isFieldEditable("date_of_birth")}>
                                <Input type="date" {...fieldProps("date_of_birth")} />
                            </Field>
                            <Field label="Nationality" locked={!isFieldEditable("nationality")}>
                                <Input {...fieldProps("nationality")} placeholder="e.g. Nigerian" />
                            </Field>
                            <Field label="Place of Birth" locked={!isFieldEditable("place_of_birth")}>
                                <Input {...fieldProps("place_of_birth")} placeholder="City, Country" />
                            </Field>
                            <Field label="Occupation" locked={!isFieldEditable("occupation")}>
                                <Input {...fieldProps("occupation")} placeholder="e.g. Engineer" />
                            </Field>
                            <Field label="Marital Status" locked={!isFieldEditable("marital_status")}>
                                <Select
                                    disabled={!isFieldEditable("marital_status") || isSaving}
                                    value={watch("marital_status")}
                                    onValueChange={(v) => setValue("marital_status", v, { shouldDirty: true })}
                                >
                                    <SelectTrigger className={`h-9 text-sm ${!isFieldEditable("marital_status") ? "opacity-50 cursor-not-allowed bg-muted" : ""}`}>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="single">Single</SelectItem>
                                        <SelectItem value="married">Married</SelectItem>
                                        <SelectItem value="widowed">Widowed</SelectItem>
                                        <SelectItem value="divorced">Divorced</SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label="Phone" locked={!isFieldEditable("phone")}>
                                <Input {...fieldProps("phone")} placeholder="+234..." type="tel" />
                            </Field>
                            <Field label="Father's Name" locked={!isFieldEditable("fathers_name")}>
                                <Input {...fieldProps("fathers_name")} />
                            </Field>
                            <Field label="Mother's Name" locked={!isFieldEditable("mothers_name")}>
                                <Input {...fieldProps("mothers_name")} />
                            </Field>
                            <div className="sm:col-span-2">
                                <Field label="Address" locked={!isFieldEditable("address")}>
                                    <Input {...fieldProps("address")} placeholder="Home address" />
                                </Field>
                            </div>
                        </div>
                    )}

                    {/* PASSPORT / TRAVEL TAB */}
                    {activeTab === "passport" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Passport Number" locked={!isFieldEditable("passport_number")}>
                                <Input {...fieldProps("passport_number")} placeholder="A12345678" />
                            </Field>
                            <Field label="Passport Expiry" locked={!isFieldEditable("passport_expiry")}>
                                <Input type="date" {...fieldProps("passport_expiry")} />
                            </Field>
                            <Field label="Departure City" locked={!isFieldEditable("departure_city")}>
                                <Input {...fieldProps("departure_city")} placeholder="e.g. Lagos" />
                            </Field>
                            <Field label="Room Preference" locked={!isFieldEditable("room_preference")}>
                                <Select
                                    disabled={!isFieldEditable("room_preference") || isSaving}
                                    value={watch("room_preference")}
                                    onValueChange={(v) => setValue("room_preference", v, { shouldDirty: true })}
                                >
                                    <SelectTrigger className={`h-9 text-sm ${!isFieldEditable("room_preference") ? "opacity-50 cursor-not-allowed bg-muted" : ""}`}>
                                        <SelectValue placeholder="Select preference" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="double">Double</SelectItem>
                                        <SelectItem value="triple">Triple</SelectItem>
                                        <SelectItem value="quad">Quad</SelectItem>
                                        <SelectItem value="quint">Quint</SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label="Meningitis Vaccine Date" locked={!isFieldEditable("meningitis_vaccine_date")}>
                                <Input type="date" {...fieldProps("meningitis_vaccine_date")} />
                            </Field>
                            <Field label="Previous Umrah?" locked={!isFieldEditable("previous_umrah")}>
                                <Select
                                    disabled={!isFieldEditable("previous_umrah") || isSaving}
                                    value={watch("previous_umrah")}
                                    onValueChange={(v) => setValue("previous_umrah", v, { shouldDirty: true })}
                                >
                                    <SelectTrigger className={`h-9 text-sm ${!isFieldEditable("previous_umrah") ? "opacity-50 cursor-not-allowed bg-muted" : ""}`}>
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="false">No</SelectItem>
                                        <SelectItem value="true">Yes</SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>
                            {watch("previous_umrah") === "true" && (
                                <Field label="Previous Umrah Year" locked={!isFieldEditable("previous_umrah_year")}>
                                    <Input {...fieldProps("previous_umrah_year")} type="number" placeholder="e.g. 2022" />
                                </Field>
                            )}
                        </div>
                    )}

                    {/* EMERGENCY TAB */}
                    {activeTab === "emergency" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Contact Name" locked={!isFieldEditable("emergency_contact_name")}>
                                <Input {...fieldProps("emergency_contact_name")} />
                            </Field>
                            <Field label="Contact Phone" locked={!isFieldEditable("emergency_contact_phone")}>
                                <Input {...fieldProps("emergency_contact_phone")} type="tel" />
                            </Field>
                            <Field label="Relationship" locked={!isFieldEditable("emergency_contact_relationship")}>
                                <Input {...fieldProps("emergency_contact_relationship")} placeholder="e.g. Spouse" />
                            </Field>
                        </div>
                    )}

                    {/* VISA & FLIGHT TAB */}
                    {activeTab === "visa_flight" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2 flex justify-end">
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 text-primary border-primary/30 bg-primary/5 hover:bg-primary hover:text-white transition-colors">
                                            <HelpCircle className="h-3.5 w-3.5" />
                                            Need Visa Support?
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[400px]">
                                        <DialogHeader>
                                            <DialogTitle className="flex items-center gap-2 text-primary">
                                                <Shield className="h-5 w-5" />
                                                Visa Support Center
                                            </DialogTitle>
                                            <DialogDescription className="pt-2 text-sm leading-relaxed">
                                                If you are an agent experiencing delays or issues with a visa application, you can request prioritized processing.
                                                <br /><br />
                                                High-rated Premium Agents have direct access to the <strong>Platinum Live Chat</strong> for instant visa processing support in their Dashboard.
                                                <br /><br />
                                                Alternatively, you can message the <span className="font-semibold text-foreground">Visa Processing</span> department via the Support Center.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="flex justify-end pt-4">
                                            <Button type="button" onClick={() => window.location.href = '/agent/support'} className="gold-gradient text-secondary-foreground text-sm font-semibold w-full">
                                                Go to Support Center
                                            </Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>

                            <Field label="Visa Provider" locked={!isFieldEditable("visa_provider")}>
                                <Select
                                    disabled={!isFieldEditable("visa_provider") || isSaving}
                                    value={watch("visa_provider")}
                                    onValueChange={(v) => setValue("visa_provider", v, { shouldDirty: true })}
                                >
                                    <SelectTrigger className={`h-9 text-sm ${!isFieldEditable("visa_provider") ? "opacity-50 cursor-not-allowed bg-muted" : ""}`}>
                                        <SelectValue placeholder="Select provider" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="None">None / Other</SelectItem>
                                        {visaProviders.map((p: any) => (
                                            <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label="Visa Type" locked={!isFieldEditable("visa_type")}>
                                <Select
                                    disabled={!isFieldEditable("visa_type") || isSaving}
                                    value={watch("visa_type")}
                                    onValueChange={(v) => setValue("visa_type", v, { shouldDirty: true })}
                                >
                                    <SelectTrigger className={`h-9 text-sm ${!isFieldEditable("visa_type") ? "opacity-50 cursor-not-allowed bg-muted" : ""}`}>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Umrah">Umrah</SelectItem>
                                        <SelectItem value="Hajj">Hajj</SelectItem>
                                        <SelectItem value="Tourist">Tourist</SelectItem>
                                        <SelectItem value="Business">Business</SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label="Flight Number" locked={!isFieldEditable("flight_number")}>
                                <Input {...fieldProps("flight_number")} placeholder="e.g. SV-102" />
                            </Field>
                            <Field label="Visa Document URL" locked={!isFieldEditable("visa_document_url")}>
                                <Input {...fieldProps("visa_document_url")} placeholder="https://..." />
                            </Field>
                            <Field label="Arrival Date" locked={!isFieldEditable("arrival_date")}>
                                <Input type="date" {...fieldProps("arrival_date")} />
                            </Field>
                            <Field label="Departure Date" locked={!isFieldEditable("departure_date")}>
                                <Input type="date" {...fieldProps("departure_date")} />
                            </Field>
                            <div className="col-span-1 sm:col-span-2 mt-2">
                                <p className="text-xs text-muted-foreground flex items-center gap-2">
                                    <Plane className="h-4 w-4 text-primary" /> Note: Ensure the flight numbers match the latest ticket details. You can upload physical visa copies in the "Docs" tab safely.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* MAHRAM TAB (female only) */}
                    {activeTab === "mahram" && gender === "female" && (
                        <div className="space-y-3">
                            <p className="text-xs text-muted-foreground bg-amber-500/10 text-amber-700 rounded-lg px-3 py-2.5">
                                Required for female pilgrims travelling without husband (Saudi Arabia requirement).
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field label="Mahram Name" locked={!isFieldEditable("mahram_name")}>
                                    <Input {...fieldProps("mahram_name")} />
                                </Field>
                                <Field label="Relationship to Mahram" locked={!isFieldEditable("mahram_relationship")}>
                                    <Input {...fieldProps("mahram_relationship")} placeholder="e.g. Father, Brother" />
                                </Field>
                                <Field label="Mahram Passport No." locked={!isFieldEditable("mahram_passport")}>
                                    <Input {...fieldProps("mahram_passport")} />
                                </Field>
                            </div>
                        </div>
                    )}

                    {/* SPECIAL REQUESTS TAB */}
                    {activeTab === "special" && (
                        <div>
                            <Field label="Special Requests" locked={!isFieldEditable("special_requests")}>
                                <Textarea
                                    {...register("special_requests")}
                                    disabled={!isFieldEditable("special_requests") || isSaving}
                                    placeholder="Wheelchair access, dietary requirements, room on low floor..."
                                    className={`min-h-[120px] text-sm resize-none ${!isFieldEditable("special_requests") ? "opacity-50 cursor-not-allowed bg-muted" : ""}`}
                                />
                            </Field>
                        </div>
                    )}

                    {/* PACKAGE & DATES TAB */}
                    {activeTab === "package" && (
                        <div className="grid grid-cols-1 gap-4">
                            <Field label="Selected Package" locked={!isFieldEditable("package_id")}>
                                <Select
                                    disabled={!isFieldEditable("package_id") || isSaving}
                                    value={watch("package_id")}
                                    onValueChange={(v) => {
                                        setValue("package_id", v, { shouldDirty: true });
                                        setValue("package_date_id", "", { shouldDirty: true });
                                    }}
                                >
                                    <SelectTrigger className={`h-9 text-sm ${!isFieldEditable("package_id") ? "opacity-50 cursor-not-allowed bg-muted" : ""}`}>
                                        <SelectValue placeholder="Select package" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {packages.map((pkg: any) => (
                                            <SelectItem key={pkg.id} value={pkg.id}>{pkg.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field label="Travel Date" locked={!isFieldEditable("package_date_id")}>
                                <Select
                                    disabled={!isFieldEditable("package_date_id") || !packageId || isSaving}
                                    value={watch("package_date_id")}
                                    onValueChange={(v) => setValue("package_date_id", v, { shouldDirty: true })}
                                >
                                    <SelectTrigger className={`h-9 text-sm ${!isFieldEditable("package_date_id") ? "opacity-50 cursor-not-allowed bg-muted" : ""}`}>
                                        <SelectValue placeholder={packageId ? "Select date" : "Select package first"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {packageDates.map((d: any) => (
                                            <SelectItem key={d.id} value={d.id}>
                                                {new Date(d.outbound).toLocaleDateString()}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            {isConfirmed && (
                                <p className="text-[10px] text-amber-600 bg-amber-50 p-2 rounded border border-amber-100 italic">
                                    Changing package or dates may require price adjustments. Admin will contact you after review.
                                </p>
                            )}
                        </div>
                    )}

                    {/* DOCUMENTS TAB */}
                    {activeTab === "documents" && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-foreground italic flex items-center gap-2">
                                    Request Document Update
                                </h3>
                                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                    {stagedDocuments.length} pending update
                                </Badge>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {["passport", "visa", "vaccine_certificate"].map((type) => {
                                    const staged = stagedDocuments.find((d: any) => d.type === type);
                                    return (
                                        <Card key={type} className="border-border/40 bg-muted/20">
                                            <CardContent className="p-3">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-semibold capitalize text-foreground">{type.replace("_", " ")}</p>
                                                            <p className="text-[10px] text-muted-foreground truncate">
                                                                {staged ? staged.file_name : "No new file uploaded"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {staged ? (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-destructive"
                                                                onClick={() => {
                                                                    const next = stagedDocuments.filter((d: any) => d.type !== type);
                                                                    setValue("documents", next, { shouldDirty: true });
                                                                }}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        ) : (
                                                            <div className="relative">
                                                                <input
                                                                    type="file"
                                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                                    accept="image/*,.pdf"
                                                                    onChange={async (e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (!file) return;

                                                                        toast.loading("Uploading temporary file...", { id: "upload" });
                                                                        try {
                                                                            const path = `${user?.id}/amendment_${Date.now()}_${file.name}`;
                                                                            const { data, error } = await supabase.storage
                                                                                .from("documents")
                                                                                .upload(path, file);

                                                                            if (error) throw error;

                                                                            const newDoc = {
                                                                                type,
                                                                                file_url: data.path,
                                                                                file_name: file.name
                                                                            };

                                                                            const next = [...stagedDocuments.filter((d: any) => d.type !== type), newDoc];
                                                                            setValue("documents", next, { shouldDirty: true });
                                                                            toast.success(`${type.replace("_", " ")} staged for update`, { id: "upload" });
                                                                        } catch (err: any) {
                                                                            toast.error("Upload failed: " + err.message, { id: "upload" });
                                                                        }
                                                                    }}
                                                                />
                                                                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 px-2">
                                                                    <Upload className="h-3 w-3" />
                                                                    Upload New
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>

                            <p className="text-[10px] text-muted-foreground italic bg-muted/50 p-2 rounded text-center">
                                Uploaded documents are staged for review and won't replace your current files until approved.
                            </p>
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border/60 shrink-0">
                    <div className="text-xs text-muted-foreground">
                        {isConfirmed && (
                            <span className="flex items-center gap-1">
                                <Lock className="h-3 w-3" />
                                Some fields locked — booking is confirmed
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={!isDirty || isSaving || saved || !isEditable}
                            className="gold-gradient text-secondary-foreground font-semibold gap-1.5 min-w-[110px]"
                            onClick={handleSubmit(onSubmit)}
                        >
                            {saved ? (
                                <><CheckCircle2 className="h-3.5 w-3.5" /> Saved!</>
                            ) : isSaving ? (
                                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</>
                            ) : isConfirmed ? (
                                "Request Change"
                            ) : (
                                "Save Changes"
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper Field wrapper
const Field = ({ label, children, locked }: { label: string; children: React.ReactNode; locked?: boolean }) => (
    <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            {label}
            {locked && <Lock className="h-2.5 w-2.5 text-muted-foreground/50" />}
        </Label>
        {children}
    </div>
);

export default EditBookingModal;
