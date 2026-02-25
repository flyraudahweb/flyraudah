import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Settings, CreditCard, Share2, ShieldCheck, Clock, Save,
    Facebook, Instagram, Twitter, MessageCircle, Globe, Phone, Mail, MapPin,
    Sparkles, AlertTriangle, ImageIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";


// ─── helpers ──────────────────────────────────────────────────────────────────

const fetchSetting = async (key: string) => {
    const { data, error } = await supabase
        .from("site_settings" as any)
        .select("*")
        .eq("key", key)
        .single();
    if (error) throw error;
    return data;
};

const upsertSetting = async (key: string, value: any) => {
    const { error } = await supabase
        .from("site_settings" as any)
        .update({ value: JSON.stringify(value), updated_at: new Date().toISOString() } as any)
        .eq("key", key);
    if (error) throw error;
};

// ─── Component ────────────────────────────────────────────────────────────────

const AdminSettings = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // ── Paystack toggle ─────────────────────────────────────────────────────────
    const { data: paystackRow } = useQuery({
        queryKey: ["setting", "paystack_enabled"],
        queryFn: () => fetchSetting("paystack_enabled"),
    });

    const paystackEnabled = paystackRow?.value === true || paystackRow?.value === "true";

    const togglePaystack = useMutation({
        mutationFn: (enabled: boolean) => upsertSetting("paystack_enabled", enabled),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["setting", "paystack_enabled"] });
            toast({ title: `Paystack ${!paystackEnabled ? "enabled" : "disabled"}` });
        },
    });

    // ── Email provider toggle ─────────────────────────────────────────────────────
    const { data: emailProviderRow } = useQuery({
        queryKey: ["setting", "email_provider"],
        queryFn: () => fetchSetting("email_provider"),
    });

    const rawEmailProvider = emailProviderRow?.value;
    const emailProvider: "supabase" | "resend" =
        rawEmailProvider === "resend" || rawEmailProvider === '"resend"' ? "resend" : "supabase";

    const toggleEmailProvider = useMutation({
        mutationFn: (provider: "supabase" | "resend") => upsertSetting("email_provider", provider),
        onSuccess: (_d, provider) => {
            queryClient.invalidateQueries({ queryKey: ["setting", "email_provider"] });
            toast({ title: `Email provider switched to ${provider === "resend" ? "Resend (Branded)" : "Supabase (Default)"}` });
        },
    });

    // ── Contact info ─────────────────────────────────────────────────────────────
    const { data: contactRow } = useQuery({
        queryKey: ["setting", "contact_info"],
        queryFn: () => fetchSetting("contact_info"),
    });

    const [contactInfo, setContactInfo] = useState({
        phone: "+234 803 537 8973",
        email: "flyraudah@gmail.com",
        address: "Kano, Nigeria",
        whatsapp: "2348035378973",
    });

    useEffect(() => {
        if (contactRow?.value && typeof contactRow.value === "object") {
            setContactInfo((prev) => ({ ...prev, ...(contactRow.value as any) }));
        }
    }, [contactRow]);

    const saveContact = useMutation({
        mutationFn: () => upsertSetting("contact_info", contactInfo),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["setting", "contact_info"] });
            toast({ title: "Contact info saved" });
        },
    });

    // ── Passport photo settings ──────────────────────────────────────────────────
    const DEFAULT_PHOTO_SETTINGS = {
        maxSizeMB: 5,
        maxWidth: 3000,
        maxHeight: 3000,
        allowedFormats: ["jpeg", "png"],
        backgroundRequirement: "White or off-white background",
        faceRequirement: "Centered, front-facing, no glasses",
        showRulesToPilgrim: true,
    };

    const { data: photoSettingsRow } = useQuery({
        queryKey: ["setting", "passport_photo_settings"],
        queryFn: () => fetchSetting("passport_photo_settings"),
    });

    const [photoSettings, setPhotoSettings] = useState(DEFAULT_PHOTO_SETTINGS);

    useEffect(() => {
        if (photoSettingsRow?.value && typeof photoSettingsRow.value === "object") {
            setPhotoSettings((prev) => ({ ...prev, ...(photoSettingsRow.value as any) }));
        }
    }, [photoSettingsRow]);

    const savePhotoSettings = useMutation({
        mutationFn: () => upsertSetting("passport_photo_settings", photoSettings),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["setting", "passport_photo_settings"] });
            toast({ title: "Passport photo requirements saved" });
        },
        onError: async () => {
            // Row might not exist yet — try inserting first
            await supabase
                .from("site_settings" as any)
                .insert({ key: "passport_photo_settings", value: JSON.stringify(DEFAULT_PHOTO_SETTINGS) } as any);
            await upsertSetting("passport_photo_settings", photoSettings);
            queryClient.invalidateQueries({ queryKey: ["setting", "passport_photo_settings"] });
            toast({ title: "Passport photo requirements saved" });
        },
    });

    const toggleFormat = (fmt: string) => {
        setPhotoSettings((prev) => ({
            ...prev,
            allowedFormats: prev.allowedFormats.includes(fmt)
                ? prev.allowedFormats.filter((f) => f !== fmt)
                : [...prev.allowedFormats, fmt],
        }));
    };

    // ── Social links ────────────────────────────────────────────────────────────
    const { data: socialRow } = useQuery({
        queryKey: ["setting", "social_links"],
        queryFn: () => fetchSetting("social_links"),
    });

    const [socialLinks, setSocialLinks] = useState({
        facebook: "",
        instagram: "",
        twitter: "",
        whatsapp: "+2348035378973",
    });

    useEffect(() => {
        if (socialRow?.value && typeof socialRow.value === "object") {
            setSocialLinks((prev) => ({ ...prev, ...(socialRow.value as any) }));
        }
    }, [socialRow]);

    const saveSocial = useMutation({
        mutationFn: () => upsertSetting("social_links", socialLinks),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["setting", "social_links"] });
            toast({ title: "Social links saved" });
        },
    });

    // ── Last login ──────────────────────────────────────────────────────────────
    const { data: lastLogin } = useQuery({
        queryKey: ["admin-last-login"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            return user?.last_sign_in_at || null;
        },
    });

    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(id);
    }, []);

    const timeSince = lastLogin
        ? formatDistanceToNow(new Date(lastLogin), { addSuffix: true })
        : "Unknown";

    return (
        <div className="space-y-6 p-4 md:p-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                    <Settings className="h-5 w-5 text-secondary" />
                </div>
                <div>
                    <h1 className="font-heading text-2xl font-bold text-foreground">Settings</h1>
                    <p className="text-sm text-muted-foreground">Configure site features and security</p>
                </div>
            </div>

            {/* Contact Info card */}
            <Card className="lg:col-span-2 border-border">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Phone className="h-5 w-5 text-secondary" />
                        Contact Information
                    </CardTitle>
                    <CardDescription>Manage contact details shown on the website footer and CTA banner</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-1.5">
                            <Label className="flex items-center gap-2 text-sm">
                                <Phone className="h-4 w-4 text-secondary" /> Phone Number
                            </Label>
                            <Input
                                placeholder="+234 803 537 8973"
                                value={contactInfo.phone}
                                onChange={(e) => setContactInfo((s) => ({ ...s, phone: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="flex items-center gap-2 text-sm">
                                <Mail className="h-4 w-4 text-secondary" /> Email Address
                            </Label>
                            <Input
                                placeholder="flyraudah@gmail.com"
                                value={contactInfo.email}
                                onChange={(e) => setContactInfo((s) => ({ ...s, email: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="flex items-center gap-2 text-sm">
                                <MapPin className="h-4 w-4 text-secondary" /> Office Address
                            </Label>
                            <Input
                                placeholder="Kano, Nigeria"
                                value={contactInfo.address}
                                onChange={(e) => setContactInfo((s) => ({ ...s, address: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="flex items-center gap-2 text-sm">
                                <MessageCircle className="h-4 w-4 text-green-500" /> WhatsApp Number (digits only)
                            </Label>
                            <Input
                                placeholder="2348035378973"
                                value={contactInfo.whatsapp}
                                onChange={(e) => setContactInfo((s) => ({ ...s, whatsapp: e.target.value }))}
                            />
                        </div>
                    </div>
                    <Button
                        onClick={() => saveContact.mutate()}
                        disabled={saveContact.isPending}
                        className="gap-2"
                    >
                        <Save className="h-4 w-4" />
                        {saveContact.isPending ? "Saving…" : "Save Contact Info"}
                    </Button>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Email Provider card */}
                <Card className="border-border">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Mail className="h-5 w-5 text-secondary" />
                            Staff Invitation Emails
                        </CardTitle>
                        <CardDescription>Choose how invitation emails are sent to new staff</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Supabase option */}
                        <div
                            onClick={() => toggleEmailProvider.mutate("supabase")}
                            className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${emailProvider === "supabase"
                                ? "border-secondary bg-secondary/5 ring-1 ring-secondary/30"
                                : "border-border bg-muted/30 hover:bg-muted/50"
                                }`}
                        >
                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                <Globe className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-foreground text-sm">Supabase Default</p>
                                <p className="text-xs text-muted-foreground">Works immediately, no setup required</p>
                            </div>
                            {emailProvider === "supabase" && (
                                <Badge variant="default" className="text-xs bg-secondary text-secondary-foreground">Active</Badge>
                            )}
                        </div>

                        {/* Resend option */}
                        <div
                            onClick={() => toggleEmailProvider.mutate("resend")}
                            className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${emailProvider === "resend"
                                ? "border-secondary bg-secondary/5 ring-1 ring-secondary/30"
                                : "border-border bg-muted/30 hover:bg-muted/50"
                                }`}
                        >
                            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                                <Sparkles className="h-5 w-5 text-amber-600" />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-foreground text-sm">Resend (Branded)</p>
                                <p className="text-xs text-muted-foreground">Beautiful custom template via team@flyraudah.com.ng</p>
                            </div>
                            {emailProvider === "resend" && (
                                <Badge variant="outline" className="text-xs border-amber-400 text-amber-600">Active</Badge>
                            )}
                        </div>

                        {emailProvider === "resend" && (
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <p className="text-xs">Requires <strong>flyraudah.com.ng</strong> to be verified on Resend. If not verified, invitations will fail.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Security card */}
                <Card className="border-border">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <ShieldCheck className="h-5 w-5 text-secondary" />
                            Security
                        </CardTitle>
                        <CardDescription>Monitor your admin account security</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border">
                            <Clock className="h-8 w-8 text-secondary" />
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">Time Since Last Login</p>
                                <p className="text-xl font-bold text-foreground">{timeSince}</p>
                                {lastLogin && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {new Date(lastLogin).toLocaleString()}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="p-4 rounded-lg border border-border bg-muted/30">
                            <p className="text-sm text-muted-foreground">
                                <ShieldCheck className="h-4 w-4 inline mr-1 text-green-500" />
                                Login notifications are sent to your email via Resend for every admin sign-in.
                                If you receive an unexpected notification, change your password immediately.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Paystack toggle */}
                <Card className="border-border">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <CreditCard className="h-5 w-5 text-secondary" />
                            Payment Gateway
                        </CardTitle>
                        <CardDescription>Control Paystack payment integration</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                                    <Globe className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">Paystack Online Payments</p>
                                    <p className="text-xs text-muted-foreground">Enable or disable online payment processing</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge variant={paystackEnabled ? "default" : "secondary"} className="text-xs">
                                    {paystackEnabled ? "Active" : "Disabled"}
                                </Badge>
                                <Switch
                                    checked={paystackEnabled}
                                    onCheckedChange={(v) => togglePaystack.mutate(v)}
                                    disabled={togglePaystack.isPending}
                                />
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            When disabled, pilgrims will only see manual bank transfer options. Paystack "Pay Now" buttons
                            will be hidden across the platform.
                        </p>
                    </CardContent>
                </Card>

                {/* Social links */}
                <Card className="lg:col-span-2 border-border">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Share2 className="h-5 w-5 text-secondary" />
                            Social Links
                        </CardTitle>
                        <CardDescription>Manage social media links displayed on the website</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="space-y-1.5">
                                <Label className="flex items-center gap-2 text-sm">
                                    <Facebook className="h-4 w-4 text-blue-600" /> Facebook URL
                                </Label>
                                <Input
                                    placeholder="https://facebook.com/raudahtravels"
                                    value={socialLinks.facebook}
                                    onChange={(e) => setSocialLinks((s) => ({ ...s, facebook: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="flex items-center gap-2 text-sm">
                                    <Instagram className="h-4 w-4 text-pink-500" /> Instagram URL
                                </Label>
                                <Input
                                    placeholder="https://instagram.com/raudahtravels"
                                    value={socialLinks.instagram}
                                    onChange={(e) => setSocialLinks((s) => ({ ...s, instagram: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="flex items-center gap-2 text-sm">
                                    <Twitter className="h-4 w-4 text-sky-500" /> Twitter / X URL
                                </Label>
                                <Input
                                    placeholder="https://x.com/raudahtravels"
                                    value={socialLinks.twitter}
                                    onChange={(e) => setSocialLinks((s) => ({ ...s, twitter: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="flex items-center gap-2 text-sm">
                                    <MessageCircle className="h-4 w-4 text-green-500" /> WhatsApp Number
                                </Label>
                                <Input
                                    placeholder="+2348035378973"
                                    value={socialLinks.whatsapp}
                                    onChange={(e) => setSocialLinks((s) => ({ ...s, whatsapp: e.target.value }))}
                                />
                            </div>
                        </div>
                        <Button
                            onClick={() => saveSocial.mutate()}
                            disabled={saveSocial.isPending}
                            className="gap-2"
                        >
                            <Save className="h-4 w-4" />
                            {saveSocial.isPending ? "Saving…" : "Save Social Links"}
                        </Button>
                    </CardContent>
                </Card>

                {/* ── Passport Photo Requirements Card ────────────────────────── */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ImageIcon className="h-5 w-5 text-primary" />
                            Passport Photo Requirements
                        </CardTitle>
                        <CardDescription>
                            Rules shown to pilgrims when uploading their passport photo for Umrah/Hajj visa.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {/* File constraints */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label>Max File Size (MB)</Label>
                                <Input
                                    type="number" min={1} max={20}
                                    value={photoSettings.maxSizeMB}
                                    onChange={(e) => setPhotoSettings((p) => ({ ...p, maxSizeMB: Number(e.target.value) }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Max Width (px)</Label>
                                <Input
                                    type="number" min={100} max={10000} step={100}
                                    value={photoSettings.maxWidth}
                                    onChange={(e) => setPhotoSettings((p) => ({ ...p, maxWidth: Number(e.target.value) }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Max Height (px)</Label>
                                <Input
                                    type="number" min={100} max={10000} step={100}
                                    value={photoSettings.maxHeight}
                                    onChange={(e) => setPhotoSettings((p) => ({ ...p, maxHeight: Number(e.target.value) }))}
                                />
                            </div>
                        </div>

                        {/* Allowed formats */}
                        <div className="space-y-2">
                            <Label>Allowed File Formats</Label>
                            <div className="flex flex-wrap gap-4">
                                {["jpeg", "png", "pdf", "heic"].map((fmt) => (
                                    <div key={fmt} className="flex items-center gap-2">
                                        <Checkbox
                                            id={`fmt-${fmt}`}
                                            checked={photoSettings.allowedFormats.includes(fmt)}
                                            onCheckedChange={() => toggleFormat(fmt)}
                                        />
                                        <Label htmlFor={`fmt-${fmt}`} className="uppercase text-xs font-semibold cursor-pointer">{fmt}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Background and face requirement text */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Background Requirement</Label>
                                <Input
                                    placeholder="e.g. White or off-white background"
                                    value={photoSettings.backgroundRequirement}
                                    onChange={(e) => setPhotoSettings((p) => ({ ...p, backgroundRequirement: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Face / Pose Requirement</Label>
                                <Input
                                    placeholder="e.g. Centered, front-facing, no glasses"
                                    value={photoSettings.faceRequirement}
                                    onChange={(e) => setPhotoSettings((p) => ({ ...p, faceRequirement: e.target.value }))}
                                />
                            </div>
                        </div>

                        {/* Show to pilgrim toggle */}
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div>
                                <p className="text-sm font-medium">Show Requirements to Pilgrims</p>
                                <p className="text-xs text-muted-foreground">Display these rules on the booking photo upload step</p>
                            </div>
                            <Switch
                                checked={photoSettings.showRulesToPilgrim}
                                onCheckedChange={(v) => setPhotoSettings((p) => ({ ...p, showRulesToPilgrim: v }))}
                            />
                        </div>

                        <Button
                            onClick={() => savePhotoSettings.mutate()}
                            disabled={savePhotoSettings.isPending}
                            className="gap-2"
                        >
                            <Save className="h-4 w-4" />
                            {savePhotoSettings.isPending ? "Saving…" : "Save Photo Requirements"}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AdminSettings;
