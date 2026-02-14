import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { User, Phone, Mail, Save } from "lucide-react";

const DashboardProfile = () => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [saving, setSaving] = useState(false);

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, phone })
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
        <CardContent className="p-6 flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-secondary/30">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-heading font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-heading text-lg font-semibold text-foreground">
              {profile?.full_name || "User"}
            </p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
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
            <Save className="h-4 w-4 mr-2" />
            {saving ? t("dashboard.profile.saving") : t("dashboard.profile.save")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardProfile;
