import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { format } from "date-fns";

// Zod validation schemas
const pilgrimSchema = z.object({
  fullName: z.string().min(2, "Full name required"),
  passportNumber: z.string().regex(/^[A-Z0-9]{6,9}$/, "Invalid passport number"),
  passportExpiry: z.string().refine((date) => new Date(date) > new Date(), "Passport must be valid"),
  dateOfBirth: z.string(),
  gender: z.enum(["male", "female"]),
});

const travelSchema = z.object({
  departureCity: z.string().min(1, "Select departure city"),
  roomPreference: z.string(),
  specialRequests: z.string().optional(),
  emergencyContactName: z.string().min(2, "Required"),
  emergencyContactPhone: z.string().regex(/^\+234\d{10}$/, "Use +234 format"),
  emergencyContactRelationship: z.string().min(2, "Required"),
});

type PilgrimForm = z.infer<typeof pilgrimSchema>;
type TravelForm = z.infer<typeof travelSchema>;

const BookingWizard = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank">("card");
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingReference, setBookingReference] = useState("");

  const pilgrimForm = useForm<PilgrimForm>({
    resolver: zodResolver(pilgrimSchema),
    defaultValues: { gender: "male" },
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

  const handlePassportUpload = async (file: File) => {
    setPassportFile(file);
  };

  const onSubmitBooking = async () => {
    if (!user || !pkg || !selectedDate) return;

    setIsSubmitting(true);
    try {
      // Upload passport photo if provided
      let passportUrl = null;
      if (passportFile) {
        const fileName = `${user.id}/${Date.now()}_passport.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("passport-photos")
          .upload(fileName, passportFile);

        if (uploadError) throw uploadError;
        passportUrl = uploadData.path;
      }

      const pilgrimData = pilgrimForm.getValues();
      const travelData = travelForm.getValues();

      // Create booking
      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          user_id: user.id,
          package_id: pkg.id,
          package_date_id: selectedDate,
          full_name: pilgrimData.fullName,
          passport_number: pilgrimData.passportNumber,
          passport_expiry: pilgrimData.passportExpiry,
          date_of_birth: pilgrimData.dateOfBirth,
          gender: pilgrimData.gender,
          departure_city: travelData.departureCity,
          room_preference: travelData.roomPreference,
          special_requests: travelData.specialRequests,
          emergency_contact_name: travelData.emergencyContactName,
          emergency_contact_phone: travelData.emergencyContactPhone,
          emergency_contact_relationship: travelData.emergencyContactRelationship,
          status: "pending",
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Upload passport document
      if (passportUrl) {
        await supabase.from("documents").insert({
          user_id: user.id,
          booking_id: bookingData.id,
          file_url: passportUrl,
          file_name: passportFile!.name,
          type: "passport",
        });
      }

      // Create payment record
      const paymentAmount = paymentMethod === "card" ? Number(pkg.price) : (pkg.minimum_deposit || Number(pkg.price));

      const { error: paymentError } = await supabase.from("payments").insert({
        booking_id: bookingData.id,
        amount: paymentAmount,
        method: paymentMethod === "card" ? "paystack" : "bank_transfer",
        status: "pending",
      });

      if (paymentError) throw paymentError;

      // If card payment, redirect to Paystack checkout
      if (paymentMethod === "card") {
        const { data: paystackData, error: paystackError } = await supabase.functions.invoke(
          "create-paystack-checkout",
          {
            body: {
              amount: paymentAmount,
              email: user.email,
              bookingId: bookingData.id,
              reference: bookingData.reference,
            },
          }
        );

        if (paystackError || !paystackData?.authorization_url) {
          toast.error("Failed to initialize payment. Please try again.");
          console.error("Paystack error:", paystackError, paystackData);
          return;
        }

        // Redirect to Paystack hosted payment page
        window.location.href = paystackData.authorization_url;
        return;
      }

      // Bank transfer: show confirmation
      setBookingReference(bookingData.reference);
      setStep(5);
      toast.success("Booking created successfully!");
    } catch (error) {
      console.error("Booking error:", error);
      toast.error("Failed to create booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (pkgLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12">
        <div className="container mx-auto max-w-3xl px-4">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!pkg) return <div className="text-center py-12">Package not found</div>;

  const makkahAccom = pkg.package_accommodations?.find((a: any) => a.city?.toLowerCase() === "makkah");
  const madinahAccom = pkg.package_accommodations?.find((a: any) => a.city?.toLowerCase() === "madinah");

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12">
      <div className="container mx-auto max-w-3xl px-4">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`w-full h-2 mx-1 rounded-full transition-all ${s <= step ? "bg-secondary" : "bg-muted"}`}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Step {step} of 5
          </p>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key={step}>
          {/* Step 1: Package Confirmation */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Confirm Package</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-heading text-lg font-bold mb-2">{pkg.name}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{pkg.description}</p>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                    <p>
                      <span className="font-medium">Price:</span> ₦{Number(pkg.price).toLocaleString()}
                    </p>
                    <p>
                      <span className="font-medium">Duration:</span> {pkg.duration}
                    </p>
                    <p>
                      <span className="font-medium">Type:</span> {pkg.type.toUpperCase()}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="font-medium mb-3 block">Select Travel Date</Label>
                  <div className="space-y-2">
                    {pkg.package_dates?.map((date: any) => (
                      <button
                        key={date.id}
                        onClick={() => setSelectedDate(date.id)}
                        className={`w-full p-3 border rounded-lg text-left transition-all ${
                          selectedDate === date.id
                            ? "border-secondary bg-secondary/10"
                            : "border-border hover:border-secondary/50"
                        }`}
                      >
                        <p className="font-medium">{date.outbound} → {date.return_date}</p>
                        {date.islamic_date && (
                          <p className="text-xs text-muted-foreground">Islamic: {date.islamic_date}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <Button onClick={() => selectedDate ? setStep(2) : toast.error("Select a date")} className="w-full">
                  Continue
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Pilgrim Information */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Pilgrim Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4">
                  <div>
                    <Label>Full Name (as on passport)</Label>
                    <Input {...pilgrimForm.register("fullName")} placeholder="Your full name" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Passport Number</Label>
                      <Input {...pilgrimForm.register("passportNumber")} placeholder="A12345678" />
                    </div>
                    <div>
                      <Label>Passport Expiry</Label>
                      <Input type="date" {...pilgrimForm.register("passportExpiry")} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Date of Birth</Label>
                      <Input type="date" {...pilgrimForm.register("dateOfBirth")} />
                    </div>
                    <div>
                      <Label>Gender</Label>
                      <select
                        {...pilgrimForm.register("gender")}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label>Passport Photo</Label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files && handlePassportUpload(e.target.files[0])}
                      className="w-full px-3 py-2 border border-input rounded-md"
                    />
                    {passportFile && <p className="text-xs text-secondary mt-1">✓ {passportFile.name}</p>}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                      Back
                    </Button>
                    <Button onClick={() => setStep(3)} className="flex-1">
                      Continue
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Travel Preferences */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Travel Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4">
                  <div>
                    <Label>Departure City</Label>
                    <select
                      {...travelForm.register("departureCity")}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    >
                      <option value="">Select city</option>
                      {pkg.departure_cities?.map((city: string) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>Room Preference</Label>
                    <select
                      {...travelForm.register("roomPreference")}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    >
                      <option value="">Select preference</option>
                      {[makkahAccom, madinahAccom].map((acc) =>
                        acc?.room_types?.map((type: string) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <Label>Special Requests / Medical Needs</Label>
                    <textarea
                      {...travelForm.register("specialRequests")}
                      placeholder="Any special requirements..."
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                      rows={3}
                    />
                  </div>

                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-medium text-sm mb-3">Emergency Contact</h4>
                    <div className="space-y-3">
                      <div>
                        <Label>Contact Name</Label>
                        <Input {...travelForm.register("emergencyContactName")} />
                      </div>
                      <div>
                        <Label>Phone (+234 format)</Label>
                        <Input {...travelForm.register("emergencyContactPhone")} placeholder="+234812345678" />
                      </div>
                      <div>
                        <Label>Relationship</Label>
                        <Input {...travelForm.register("emergencyContactRelationship")} />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                      Back
                    </Button>
                    <Button onClick={() => setStep(4)} className="flex-1">
                      Continue
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Payment Selection */}
          {step === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                  <p className="text-3xl font-bold text-secondary">₦{Number(pkg.price).toLocaleString()}</p>
                  {pkg.deposit_allowed && (
                    <p className="text-sm text-muted-foreground mt-2">Deposit: ₦{Number(pkg.minimum_deposit || 0).toLocaleString()}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => setPaymentMethod("card")}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                      paymentMethod === "card" ? "border-secondary bg-secondary/10" : "border-border"
                    }`}
                  >
                    <p className="font-medium">Card Payment (Paystack)</p>
                    <p className="text-xs text-muted-foreground">Secure card payment gateway</p>
                  </button>

                  <button
                    onClick={() => setPaymentMethod("bank")}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                      paymentMethod === "bank" ? "border-secondary bg-secondary/10" : "border-border"
                    }`}
                  >
                    <p className="font-medium">Bank Transfer</p>
                    <p className="text-xs text-muted-foreground">Transfer to WEMA Bank Account</p>
                  </button>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
                    Back
                  </Button>
                  <Button onClick={onSubmitBooking} disabled={isSubmitting} className="flex-1">
                    {isSubmitting ? "Processing..." : "Complete Booking"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Confirmation */}
          {step === 5 && (
            <Card>
              <CardHeader>
                <CardTitle>Booking Confirmed!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-accent/20 border border-accent rounded-lg p-4">
                  <p className="text-accent font-medium">✓ Your booking has been successfully created</p>
                </div>

                <div className="space-y-2 text-center">
                  <p className="text-muted-foreground text-sm">Your Booking Reference</p>
                  <p className="text-2xl font-bold font-mono text-secondary">{bookingReference}</p>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Package:</span> {pkg.name}
                  </p>
                  <p>
                    <span className="font-medium">Amount:</span> ₦{Number(pkg.price).toLocaleString()}
                  </p>
                  <p>
                    <span className="font-medium">Status:</span> <span className="text-destructive">Pending Confirmation</span>
                  </p>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Check your email for booking details and next steps.
                </p>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => navigate("/dashboard/bookings")} className="flex-1">
                    My Bookings
                  </Button>
                  <Button onClick={() => navigate("/packages")} className="flex-1">
                    Browse More
                  </Button>
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
