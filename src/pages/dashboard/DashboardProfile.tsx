import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { User, Phone, Mail, Save, Camera, Loader2, Trash2 } from "lucide-react";

const DashboardProfile = () => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type and size (max 5MB)
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a JPG, PNG or WebP image", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum photo size is 5MB", variant: "destructive" });
      return;
    }

    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;

      // Upload to Supabase storage (bucket: avatars)
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);

      // Add cache-bust param so browser refreshes
      const urlWithBust = `${publicUrl}?t=${Date.now()}`;

      // Save to profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlWithBust })
        .eq("id", user.id);

      if (profileError) throw profileError;

      setAvatarUrl(urlWithBust);
      toast({ title: "Photo updated!", description: "Your profile photo has been saved." });
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("Bucket not found") || msg.includes("bucket")) {
        toast({
          title: "Storage bucket missing",
          description: "Please create an 'avatars' bucket in Supabase Storage (Settings → Storage) and set it to public.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Upload failed", description: msg || "Please try again.", variant: "destructive" });
      }
    } finally {
      setUploadingPhoto(false);
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    if (!user || !avatarUrl) return;
    setUploadingPhoto(true);
    try {
      await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
      setAvatarUrl("");
      toast({ title: "Photo removed" });
    } catch {
      toast({ title: "Failed to remove photo", variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), phone: phone.trim() })
        .eq("id", user.id);
      if (error) throw error;
      toast({ title: t("dashboard.profile.saved"), description: t("dashboard.profile.savedDesc") });
    } catch {
      toast({ title: t("dashboard.profile.error"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          {t("dashboard.profile.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("dashboard.profile.subtitle")}
        </p>
      </div>

      {/* Avatar Section */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Avatar with camera overlay */}
            <div className="relative group shrink-0">
              <Avatar className="h-20 w-20 border-2 border-secondary/30">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-heading font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {/* Camera overlay button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                title="Change photo"
              >
                {uploadingPhoto ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>

            <div className="flex-1 text-center sm:text-left">
              <p className="font-heading text-lg font-semibold text-foreground">
                {profile?.full_name || "User"}
              </p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                  {uploadingPhoto ? "Uploading..." : "Change Photo"}
                </Button>
                {avatarUrl && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleRemovePhoto}
                    disabled={uploadingPhoto}
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground/60 mt-2">JPG, PNG or WebP · max 5MB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Info */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <User className="h-4 w-4 text-secondary" />
            {t("dashboard.profile.personalInfo")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">{t("dashboard.profile.fullName")}</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-1.5">
              <Mail className="h-3 w-3" />
              {t("dashboard.profile.email")}
            </Label>
            <Input id="email" value={user?.email || ""} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">{t("dashboard.profile.emailNote")}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-1.5">
              <Phone className="h-3 w-3" />
              {t("dashboard.profile.phone")}
            </Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+234XXXXXXXXXX"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="gold-gradient text-secondary-foreground font-semibold"
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {saving ? t("dashboard.profile.saving") : t("dashboard.profile.save")}
          </Button>
        </CardContent>
      </Card>

      {/* Support Section */}
      <Card className="border-border lg:hidden">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Mail className="h-4 w-4 text-secondary" />
            Support &amp; Help
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Having trouble or need assistance with your booking? Our support team is here to help 24/7.
          </p>
          <Button
            variant="outline"
            className="w-full border-secondary/50 text-secondary hover:bg-secondary/10"
            onClick={() => {
              const base = pathname.startsWith("/agent") ? "/agent" : "/dashboard";
              navigate(`${base}/support`);
            }}
          >
            Open Support Ticket
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardProfile;
