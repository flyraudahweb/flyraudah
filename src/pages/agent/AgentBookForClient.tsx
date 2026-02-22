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
import { ArrowLeft, CheckCircle, Percent } from "lucide-react";

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

  if (pkgLoading) return <div className="p-8"><Skeleton className="h-96" /></div>;
  if (!pkg) return <div className="text-center py-12">Package not found</div>;

  const selectedClient = clients.find((c: any) => c.id === selectedClientId);
  const wholesalePrice = pkg.price - (pkg.price * (agent?.commission_rate || pkg.agent_discount) / 100);
  const savings = pkg.price - wholesalePrice;

  const roomTypes = [
    ...(pkg.package_accommodations?.flatMap((a: any) => a.room_types || []) || []),
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  const handleSubmit = async () => {
    if (!user || !agent || !selectedClient || !selectedDateId) return;

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
        .insert({
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
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Create payment record at wholesale price
      await supabase.from("payments").insert({
        booking_id: bookingData.id,
        amount: wholesalePrice,
        method: "bank_transfer",
        status: "pending",
      });

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
                  <Percent className="h-3 w-3" />
                  You save ₦{savings.toLocaleString()}
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

              <div>
                <Label>Departure City</Label>
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

              {roomTypes.length > 0 && (
                <div>
                  <Label>Room Preference</Label>
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

              <div>
                <Label>Special Requests</Label>
                <textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Any medical needs or special requirements..."
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                  rows={2}
                />
              </div>

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
                <div>
                  <Label>Emergency Contact Name</Label>
                  <Input value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} />
                </div>
                <div>
                  <Label>Phone (+234 format)</Label>
                  <Input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} placeholder="+2348123456789" />
                </div>
                <div>
                  <Label>Relationship</Label>
                  <Input value={emergencyRelation} onChange={(e) => setEmergencyRelation(e.target.value)} placeholder="e.g. Spouse, Parent" />
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
                <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? "Creating Booking..." : "Confirm Booking"}
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
              <h2 className="text-2xl font-bold">Booking Created!</h2>
              <p className="text-muted-foreground">
                Reference: <span className="font-mono font-bold text-foreground">{bookingRef}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Booking for <strong>{selectedClient?.full_name}</strong> at wholesale price of ₦{wholesalePrice.toLocaleString()}
              </p>
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
