import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Phone, Mail } from "lucide-react";

const DashboardSupport = () => {
  const { t } = useTranslation();

  const handleWhatsApp = () => {
    window.open("https://wa.me/2348035378973?text=Hello%20Raudah%20Travels,%20I%20need%20assistance.", "_blank");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          {t("dashboard.support.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("dashboard.support.subtitle")}
        </p>
      </div>

      <div className="grid gap-4">
        <Card className="border-border hover:shadow-md transition-shadow cursor-pointer" onClick={handleWhatsApp}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <MessageCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">WhatsApp</h3>
              <p className="text-sm text-muted-foreground">{t("dashboard.support.whatsappDesc")}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Phone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">{t("dashboard.support.phone")}</h3>
              <p className="text-sm text-muted-foreground">+234 803 537 8973</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-full bg-secondary/10">
              <Mail className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">{t("dashboard.support.email")}</h3>
              <p className="text-sm text-muted-foreground">flyraudah@gmail.com</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardSupport;
