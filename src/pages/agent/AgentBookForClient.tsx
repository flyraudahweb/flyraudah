import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAgentProfile } from "@/hooks/useAgentProfile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, Percent, CreditCard, Upload, CheckCircle2, Loader2 } from "lucide-react";
import { formatPrice } from "@/data/packages";
import { useBookingFormFields, useSystemFieldConfig } from "@/hooks/useBookingFormFields";
import { usePaystackEnabled } from "@/hooks/usePaystackEnabled";
import CustomFieldsSection from "@/components/bookings/CustomFieldsSection";

const AgentBookForClient = () => {
  const { id: packageId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: agent } = useAgentProfile();

  const [step, setStep] = useState(1);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedDateId, setSelectedDateId] = useState("");
  const [departureCity, setDepartureCity] = useState("");
  const [roomPreference, setRoomPreference] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRelation, setEmergencyRelation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingRef, setBookingRef] = useState("");
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);
  const { paystackEnabled } = usePaystackEnabled();
  const [paymentMethod, setPaymentMethod] = useState<"bank_transfer" | "paystack">("bank_transfer");
  const [transferProofUrl, setTransferProofUrl] = useState("");
  const [proofUploading, setProofUploading] = useState(false);

  const handleProofUpload = async (file: File) => {
    setProofUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `agent-proofs/${Date.now()}_${agent?.id ?? "unknown"}.${ext}`;
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
  const { data: customFields = [] } = useBookingFormFields("agent");
  const { get: sysField } = useSystemFieldConfig();
  const [customData, setCustomData] = useState<Record<string, string>>({});
  const [customUploading, setCustomUploading] = useState<Record<string, boolean>>();
  const handleCustomChange = (key: string, value: string) => setCustomData((p) => ({ ...p, [key]: value }));

  const { data: pkg, isLoading: pkgLoading } = useQuery({
    queryKey: ["package", packageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("*, package_accommodations(*), package_dates(*)")
        .eq("id", packageId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!packageId,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["agent-clients", agent?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_clients")
        .select("*")
        .eq("agent_id", agent!.id)
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: !!agent?.id,
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts" as any)
        .select("*")
        .eq("is_active", true)
        .order("created_at");
      if (error) {
        console.warn("bank_accounts query error:", error.message);
        return [];
      }
      return data as any[];
    },
  });

  if (pkgLoading) return <div className="p-8"><Skeleton className="h-96" /></div>;
  if (!pkg) return <div className="text-center py-12">Package not found</div>;

  const selectedClient = clients.find((c: any) => c.id === selectedClientId);
  // Always cast to Number — Supabase returns numeric columns as strings in JS
  const pkgPrice = Number(pkg.price);
  const commissionRate = Number(agent?.commission_rate ?? 0);
  const commissionType = agent?.commission_type ?? "percentage";
  const pkgDiscount = Number(pkg.agent_discount ?? 0);

  let wholesalePrice: number;
  if (commissionType === "fixed") {
    wholesalePrice = Math.max(0, pkgPrice - commissionRate);
  } else if (commissionRate > 0) {
    wholesalePrice = Math.max(0, pkgPrice - (pkgPrice * commissionRate / 100));
  } else {
    wholesalePrice = Math.max(0, pkgPrice - pkgDiscount);
  }
  const savings = pkgPrice - wholesalePrice;




  const roomTypes = [
    ...(pkg.package_accommodations?.flatMap((a: any) => a.room_types || []) || []),
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  const handleSubmit = async () => {
    if (!user || !agent || !selectedClient || !selectedDateId) return;
    setIsSubmitting(true);

    try {
      // CRITICAL SECURITY: Verify agent identity and client ownership server-side
      const { data: verifiedAgent, error: agentVerifyError } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (agentVerifyError || !verifiedAgent) {
        throw new Error("Unauthorized: Agent profile verification failed.");
      }

      const { data: verifiedClient, error: clientVerifyError } = await supabase
        .from("agent_clients")
        .select("id")
        .eq("id", selectedClientId)
        .eq("agent_id", verifiedAgent.id)
        .single();

      if (clientVerifyError || !verifiedClient) {
        throw new Error("Unauthorized: Client does not belong to this agent.");
      }

      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .upsert({
          id: pendingBookingId || undefined,
          user_id: user.id,
          package_id: pkg.id,
          package_date_id: selectedDateId,
          agent_id: verifiedAgent.id,
          agent_client_id: verifiedClient.id,
          full_name: selectedClient.full_name,
          passport_number: selectedClient.passport_number,
          passport_expiry: selectedClient.passport_expiry,
          date_of_birth: selectedClient.date_of_birth,
          gender: selectedClient.gender,
          departure_city: departureCity,
          room_preference: roomPreference,
          special_requests: specialRequests || null,
          emergency_contact_name: emergencyName,
          emergency_contact_phone: emergencyPhone,
          emergency_contact_relationship: emergencyRelation,
          status: "pending",
          custom_data: Object.keys(customData).length > 0 ? customData : null,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;
      setPendingBookingId(bookingData.id);

      // Create/Update payment record at wholesale price
      const { data: paymentData, error: paymentError } = await supabase
        .from("payments")
        .upsert({
          id: pendingPaymentId || undefined,
          booking_id: bookingData.id,
          amount: wholesalePrice,
          method: paymentMethod,
          status: "pending",
          proof_of_payment_url: paymentMethod === "bank_transfer" && transferProofUrl ? transferProofUrl : null,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;
      if (paymentData) setPendingPaymentId(paymentData.id);

      // Card → Paystack Inline Popup
      if (paymentMethod === "paystack") {
        try {
          // Re-verify session before invoking edge function
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("Please log in again to continue.");

          // Only refresh if session is about to expire (within 5 mins)
          const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
          if (expiresAt && (expiresAt - Date.now()) < 5 * 60 * 1000) {
            await supabase.auth.refreshSession();
          }
        } catch (authErr) {
          console.warn("Auth check failed:", authErr);
        }

        const { data: paystackData, error: paystackError } = await supabase.functions.invoke(
          "create-paystack-checkout",
          { body: { email: user.email, bookingId: bookingData.id } }
        );

        if (paystackError || !paystackData?.access_code) {
          throw new Error("Failed to initialize Paystack payment.");
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

        const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
        if (!publicKey) {
          console.error("Paystack Public Key (VITE_PAYSTACK_PUBLIC_KEY) is missing!");
          toast.error("Payment configuration error.");
          return;
        }

        const handler = (window as any).PaystackPop.setup({
          key: publicKey,
          email: user?.email || "",
          amount: Math.round((paystackData.amount || wholesalePrice) * 100),
          access_code: paystackData.access_code,
          callback: (response: any) => {
            console.log("Payment success:", response);
            navigate(`/payment/callback?reference=${response.reference}`);
          },
          onClose: () => {
            toast.info("Payment was cancelled. You can retry or change the payment method.");
          },
        });

        handler.openIframe();
        return;
      }

      setBookingRef(bookingData.reference || bookingData.id.slice(0, 8));
      setStep(4);
      toast.success("Booking created successfully!");
    } catch (err: any) {
      console.error("Agent booking error:", err);
      toast.error(err.message || "Failed to create booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Button variant="ghost" onClick={() => navigate("/agent/packages")} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Back to Packages
      </Button>

      {/* Progress */}
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={`flex-1 h-2 rounded-full transition-all ${s <= step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key={step}>
        {/* Step 1: Select Client */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold">{pkg.name}</h3>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-bold text-primary">₦{wholesalePrice.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground line-through">₦{Number(pkg.price).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-chart-2 mt-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {commissionType === "fixed"
                    ? `Fixed commission: ${formatPrice(commissionRate)}`
                    : `You save ${formatPrice(savings)} (${commissionRate}%)`}
                </div>
              </div>

              {clients.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No clients registered. <button onClick={() => navigate("/agent/clients")} className="text-primary underline">Add a client first</button>.
                  </AlertDescription>
                </Alert>
              ) : (
                <div>
                  <Label>Choose a client</Label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.full_name} — {c.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedClient && (
                    <div className="mt-3 p-3 bg-muted/50 rounded-lg text-sm space-y-1">
                      <p><span className="text-muted-foreground">Passport:</span> {selectedClient.passport_number || "Not provided"}</p>
                      <p><span className="text-muted-foreground">Gender:</span> {selectedClient.gender || "Not set"}</p>
                      {!selectedClient.passport_number && (
                        <p className="text-chart-4 text-xs mt-2">⚠ Passport info missing. You can update client details later.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <Button onClick={() => setStep(2)} disabled={!selectedClientId} className="w-full">
                Continue
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Travel Details */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Travel Details for {selectedClient?.full_name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Travel Date *</Label>
                <Select value={selectedDateId} onValueChange={setSelectedDateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select date..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pkg.package_dates?.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.outbound} → {d.return_date}
                        {d.islamic_date ? ` (${d.islamic_date})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {sysField('departure_city', 'Departure City').enabled && (
                <div>
                  <Label>{sysField('departure_city', 'Departure City').label}</Label>
                  <Select value={departureCity} onValueChange={setDepartureCity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select city..." />
                    </SelectTrigger>
                    <SelectContent>
                      {pkg.departure_cities?.map((city: string) => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {roomTypes.length > 0 && sysField('room_preference', 'Room Preference').enabled && (
                <div>
                  <Label>{sysField('room_preference', 'Room Preference').label}</Label>
                  <Select value={roomPreference} onValueChange={setRoomPreference}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select room..." />
                    </SelectTrigger>
                    <SelectContent>
                      {roomTypes.map((r: string) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {sysField('special_requests', 'Special Requests').enabled && (
                <div>
                  <Label>{sysField('special_requests', 'Special Requests').label}</Label>
                  <textarea
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder={sysField('special_requests', '', 'Any medical needs or special requirements...').placeholder ?? 'Any medical needs or special requirements...'}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                    rows={2}
                  />
                </div>
              )}

              {/* ── Admin-defined custom fields ── */}
              {customFields.length > 0 && (
                <div className="space-y-3 pt-1">
                  <p className="text-sm font-medium text-muted-foreground">Additional Information</p>
                  <CustomFieldsSection
                    fields={customFields}
                    values={customData}
                    onChange={handleCustomChange}
                    uploading={customUploading ?? {}}
                    onUploadingChange={(key, val) =>
                      setCustomUploading((p) => ({ ...(p ?? {}), [key]: val }))
                    }
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                <Button onClick={() => setStep(3)} disabled={!selectedDateId} className="flex-1">Continue</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Emergency + Confirm */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact & Confirm</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg space-y-1 text-sm">
                <p><span className="text-muted-foreground">Client:</span> <strong>{selectedClient?.full_name}</strong></p>
                <p><span className="text-muted-foreground">Package:</span> {pkg.name}</p>
                <p><span className="text-muted-foreground">Wholesale Price:</span> <strong className="text-primary">₦{wholesalePrice.toLocaleString()}</strong></p>
                <p><span className="text-muted-foreground">Departure:</span> {departureCity || "—"}</p>
              </div>

              <div className="space-y-3">
                {sysField('emergency_contact_name', 'Emergency Contact Name').enabled && (
                  <div>
                    <Label>
                      {sysField('emergency_contact_name', 'Emergency Contact Name').label}
                      {sysField('emergency_contact_name', 'Emergency Contact Name').required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <Input value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} />
                  </div>
                )}
                {sysField('emergency_contact_phone', 'Phone (+234 format)').enabled && (
                  <div>
                    <Label>
                      {sysField('emergency_contact_phone', 'Phone (+234 format)').label}
                      {sysField('emergency_contact_phone', 'Phone (+234 format)').required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <Input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} placeholder="+2348123456789" />
                  </div>
                )}
                {sysField('emergency_contact_relationship', 'Relationship').enabled && (
                  <div>
                    <Label>
                      {sysField('emergency_contact_relationship', 'Relationship').label}
                      {sysField('emergency_contact_relationship', 'Relationship').required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <Input value={emergencyRelation} onChange={(e) => setEmergencyRelation(e.target.value)} placeholder="e.g. Spouse, Parent" />
                  </div>
                )}
              </div>

              {/* Payment Selection */}
              <div className="space-y-3 pt-4 border-t">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Select Payment Method
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { setPaymentMethod("bank_transfer"); setTransferProofUrl(""); }}
                    className={`p-3 border rounded-xl text-left transition-all ${paymentMethod === "bank_transfer" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/50"}`}
                  >
                    <p className="text-xs font-bold">Bank Transfer</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Upload proof of payment</p>
                  </button>
                  <button
                    disabled={!paystackEnabled}
                    onClick={() => setPaymentMethod("paystack")}
                    className={`p-3 border rounded-xl text-left transition-all ${paymentMethod === "paystack" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/50"} ${!paystackEnabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <p className="text-xs font-bold">Card / Online</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Instant activation</p>
                  </button>
                </div>

                {/* Bank Transfer: show bank account + require proof upload */}
                {paymentMethod === "bank_transfer" && (
                  <div className="rounded-xl border border-dashed border-amber-400 bg-amber-50 dark:bg-amber-900/10 p-4 space-y-3">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      ⚠ Upload proof of payment before confirming
                    </p>

                    {/* Bank account details */}
                    {bankAccounts.length > 0 ? (
                      <div className="space-y-2">
                        {bankAccounts.map((acct: any) => (
                          <div key={acct.id} className="bg-white dark:bg-background rounded-lg p-3 text-xs space-y-1 border border-amber-200">
                            <p className="font-bold">{acct.bank_name}</p>
                            <p className="text-muted-foreground">Account Name: <span className="font-medium text-foreground">{acct.account_name}</span></p>
                            <p className="text-muted-foreground">Account No: <span className="font-mono font-bold text-primary text-sm">{acct.account_number}</span></p>
                            {acct.sort_code && <p className="text-muted-foreground">Sort Code: {acct.sort_code}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Contact our office for bank account details.</p>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Transfer <strong>₦{wholesalePrice.toLocaleString()}</strong> then upload your receipt or bank teller below.
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
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || (paymentMethod === "bank_transfer" && !transferProofUrl)}
                  className="flex-1"
                >
                  {isSubmitting ? "Creating Booking..." : paymentMethod === "bank_transfer" ? "Confirm Booking" : "Proceed to Payment"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-chart-2 mx-auto" />
              <h2 className="text-2xl font-bold">
                {paymentMethod === "bank_transfer" ? "Booking Submitted!" : "Booking Created!"}
              </h2>
              <p className="text-muted-foreground">
                Reference: <span className="font-mono font-bold text-foreground">{bookingRef}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Booking for <strong>{selectedClient?.full_name}</strong> at wholesale price of ₦{wholesalePrice.toLocaleString()}
              </p>
              {paymentMethod === "bank_transfer" && transferProofUrl && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 max-w-sm mx-auto">
                  <p className="text-xs font-semibold text-emerald-700 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Payment Proof Submitted
                  </p>
                </div>
              )}
              <div className="flex gap-2 justify-center pt-4">
                <Button variant="outline" onClick={() => navigate("/agent/bookings")}>View Bookings</Button>
                <Button onClick={() => navigate("/agent/packages")}>Book Another</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
};

export default AgentBookForClient;
