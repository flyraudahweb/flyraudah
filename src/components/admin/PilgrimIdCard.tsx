import { QRCodeSVG } from "qrcode.react";
import { Badge } from "@/components/ui/badge";

export interface Booking {
  id: string;
  full_name: string;
  passport_number: string | null;
  reference: string | null;
  gender: string | null;
  status: string;
  departure_city: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  package: { name: string; type: string };
}

export type CardOrientation = "portrait" | "landscape";
export type CardTheme = "classic" | "modern" | "minimal";

const themeStyles: Record<CardTheme, {
  headerBg: string;
  headerText: string;
  accentStripe: string;
  footerBg: string;
  qrColor: string;
  badgeBg: string;
}> = {
  classic: {
    headerBg: "linear-gradient(135deg, #084733 0%, #0d6b4a 100%)",
    headerText: "#ffffff",
    accentStripe: "repeating-linear-gradient(135deg, transparent, transparent 6px, rgba(255,255,255,0.08) 6px, rgba(255,255,255,0.08) 12px), linear-gradient(135deg, #16a34a 0%, #15803d 50%, #166534 100%)",
    footerBg: "linear-gradient(135deg, #084733 0%, #0d6b4a 100%)",
    qrColor: "hsl(162, 90%, 17%)",
    badgeBg: "bg-emerald-600/20 text-emerald-100",
  },
  modern: {
    headerBg: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
    headerText: "#ffffff",
    accentStripe: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)",
    footerBg: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
    qrColor: "#4f46e5",
    badgeBg: "bg-indigo-500/20 text-indigo-200",
  },
  minimal: {
    headerBg: "linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)",
    headerText: "#0f172a",
    accentStripe: "linear-gradient(135deg, #0f172a 0%, #334155 100%)",
    footerBg: "linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)",
    qrColor: "#0f172a",
    badgeBg: "bg-slate-800/10 text-slate-600",
  },
};

interface PilgrimIdCardProps {
  booking: Booking;
  orientation?: CardOrientation;
  theme?: CardTheme;
}

const PilgrimIdCard = ({ booking, orientation = "portrait", theme = "classic" }: PilgrimIdCardProps) => {
  const initials = booking.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const year = new Date().getFullYear();
  const cardNumber = `RTT-${year}-${booking.id.slice(-4).toUpperCase()}`;
  const ts = themeStyles[theme];
  const isMinimal = theme === "minimal";

  if (orientation === "landscape") {
    return (
      <div
        className="id-card relative rounded-xl overflow-hidden border-2 border-border shadow-lg bg-card print:shadow-none print:border print:border-border hover:shadow-gold-glow transition-shadow duration-300"
        style={{ width: 480, height: 280 }}
      >
        {/* Geometric watermark */}
        <div className="absolute inset-0 geometric-overlay opacity-20 pointer-events-none" />

        <div className="flex h-full">
          {/* Left band */}
          <div
            className="w-[140px] flex flex-col items-center justify-between py-4 shrink-0 relative"
            style={{ background: ts.headerBg }}
          >
            <div className="text-center">
              <img src="https://i.ibb.co/C3zkfpVR/Rauda-Logo-2-PNG.png" alt="Logo" className={`h-5 w-auto mx-auto mb-1 ${isMinimal ? "" : "brightness-0 invert"}`} />
              <p className="text-[9px] font-body font-semibold" style={{ color: isMinimal ? "#334155" : "rgba(255,255,255,0.9)" }}>PILGRIM ID</p>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="h-16 w-16 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center">
                <span className="font-heading text-lg font-bold" style={{ color: ts.headerText }}>{initials}</span>
              </div>
              <Badge variant="secondary" className={`text-[8px] capitalize px-2 ${ts.badgeBg}`}>
                {booking.status}
              </Badge>
            </div>

            <span className="text-[8px] font-mono" style={{ color: isMinimal ? "#64748b" : "rgba(255,255,255,0.5)" }}>
              {cardNumber}
            </span>
          </div>

          {/* Right content */}
          <div className="flex-1 flex flex-col">
            {/* Accent stripe */}
            <div className="h-1.5" style={{ background: ts.accentStripe }} />

            <div className="flex-1 p-4 flex gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-heading text-base font-bold text-foreground truncate mb-2">
                  {booking.full_name}
                </h4>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
                  <Field label="Reference" value={booking.reference || "—"} />
                  <Field label="Package" value={booking.package.name} />
                  <Field label="Passport" value={booking.passport_number || "—"} />
                  <Field label="Gender" value={booking.gender || "—"} capitalize />
                  <Field label="Departure" value={booking.departure_city || "—"} />
                  <Field label="Type" value={booking.package.type} capitalize />
                </div>
                <div className="mt-2 pt-1 border-t border-border/50 text-[9px]">
                  <span className="text-muted-foreground">Emergency: </span>
                  <span className="font-medium text-foreground">
                    {booking.emergency_contact_name && booking.emergency_contact_phone
                      ? `${booking.emergency_contact_name} (${booking.emergency_contact_phone})`
                      : "Not provided"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center shrink-0">
                <div className="qr-container rounded-md p-1 bg-card border border-border/40">
                  <QRCodeSVG value={booking.reference || booking.id} size={68} level="M" fgColor={ts.qrColor} bgColor="transparent" />
                </div>
                <span className="text-[7px] text-muted-foreground mt-1 font-mono">
                  {booking.reference || booking.id.slice(0, 8)}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-1" style={{ background: ts.footerBg }}>
              <p className="text-[8px] font-body italic" style={{ color: isMinimal ? "#64748b" : "rgba(255,255,255,0.7)" }}>
                Your Gateway to the Holy Lands • Kano, Nigeria
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Portrait layout (default)
  return (
    <div className="id-card relative w-full max-w-[420px] rounded-xl overflow-hidden border-2 border-border shadow-lg bg-card print:shadow-none print:border print:border-border hover:shadow-gold-glow transition-shadow duration-300">
      <div className="absolute inset-0 geometric-overlay opacity-30 pointer-events-none" />

      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between relative" style={{ background: ts.headerBg }}>
        <div className="flex items-center gap-2">
          <img src="https://i.ibb.co/C3zkfpVR/Rauda-Logo-2-PNG.png" alt="Raudah Logo" className={`h-5 w-auto ${isMinimal ? "" : "brightness-0 invert"}`} />
          <div>
            <h3 className="font-heading text-sm font-bold tracking-wide" style={{ color: ts.headerText }}>
              PILGRIM ID CARD
            </h3>
            <p className="text-[10px] font-body" style={{ color: isMinimal ? "#64748b" : "rgba(255,255,255,0.8)" }}>
              Raudah Travels &amp; Tours
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-mono font-semibold block" style={{ color: isMinimal ? "#334155" : "rgba(255,255,255,0.9)" }}>
            {cardNumber}
          </span>
          <span className="text-[9px] font-body" style={{ color: isMinimal ? "#94a3b8" : "rgba(255,255,255,0.6)" }}>{year}</span>
        </div>
      </div>

      {/* Accent stripe */}
      <div className="h-1.5" style={{ background: ts.accentStripe }} />

      {/* Body */}
      <div className="p-4 flex gap-4 relative">
        <div className="flex flex-col items-center gap-2 min-w-[80px]">
          <div className="h-18 w-18 rounded-full bg-primary/10 border-2 border-secondary flex items-center justify-center" style={{ width: 72, height: 72 }}>
            <span className="font-heading text-xl font-bold text-primary">{initials}</span>
          </div>
          <Badge variant={booking.status === "confirmed" ? "default" : "secondary"} className="text-[9px] capitalize px-2">
            {booking.status}
          </Badge>
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-heading text-base font-bold text-foreground truncate mb-2">
            {booking.full_name}
          </h4>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
            <Field label="Reference" value={booking.reference || "—"} />
            <Field label="Package" value={booking.package.name} />
            <Field label="Passport No." value={booking.passport_number || "—"} />
            <Field label="Gender" value={booking.gender || "—"} capitalize />
            <Field label="Departure" value={booking.departure_city || "—"} />
            <Field label="Type" value={booking.package.type} capitalize />
          </div>
          <div className="mt-2 pt-1.5 border-t border-border/50 text-[10px]">
            <span className="text-muted-foreground">Emergency: </span>
            <span className="font-medium text-foreground">
              {booking.emergency_contact_name && booking.emergency_contact_phone
                ? `${booking.emergency_contact_name} (${booking.emergency_contact_phone})`
                : "Not provided"}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center shrink-0">
          <div className="qr-container rounded-md p-1 bg-card border border-border/40">
            <QRCodeSVG value={booking.reference || booking.id} size={72} level="M" fgColor={ts.qrColor} bgColor="transparent" />
          </div>
          <span className="text-[8px] text-muted-foreground mt-1 font-mono">
            {booking.reference || booking.id.slice(0, 8)}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-1.5 flex items-center justify-between" style={{ background: ts.footerBg }}>
        <p className="text-[9px] font-body italic" style={{ color: isMinimal ? "#64748b" : "rgba(255,255,255,0.8)" }}>
          Your Gateway to the Holy Lands
        </p>
        <p className="text-[9px] font-body" style={{ color: isMinimal ? "#94a3b8" : "rgba(255,255,255,0.6)" }}>
          Kano, Nigeria
        </p>
      </div>
    </div>
  );
};

const Field = ({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) => (
  <div>
    <span className="text-muted-foreground font-medium">{label}</span>
    <p className={`font-semibold text-foreground truncate ${capitalize ? "capitalize" : ""}`}>{value}</p>
  </div>
);

export default PilgrimIdCard;
