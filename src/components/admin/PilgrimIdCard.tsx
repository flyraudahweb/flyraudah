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

const PilgrimIdCard = ({ booking }: { booking: Booking }) => {
  const initials = booking.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const year = new Date().getFullYear();
  const cardNumber = `RTT-${year}-${booking.id.slice(-4).toUpperCase()}`;

  return (
    <div className="id-card relative w-full max-w-[420px] rounded-xl overflow-hidden border-2 border-border shadow-lg bg-card print:shadow-none print:border print:border-border hover:shadow-gold-glow transition-shadow duration-300">
      {/* Islamic geometric watermark */}
      <div className="absolute inset-0 geometric-overlay opacity-30 pointer-events-none" />

      {/* Header with emerald gradient */}
      <div className="emerald-gradient px-5 py-3 flex items-center justify-between relative">
        <div className="flex items-center gap-2">
          {/* Crescent & star */}
          <img src="https://i.ibb.co/C3zkfpVR/Rauda-Logo-2-PNG.png" alt="Raudah Logo" className="h-5 w-auto brightness-0 invert" />
          <div>
            <h3 className="font-heading text-sm font-bold text-primary-foreground tracking-wide">
              PILGRIM ID CARD
            </h3>
            <p className="text-[10px] text-primary-foreground/80 font-body">
              Raudah Travels &amp; Tours
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[9px] text-primary-foreground/90 font-mono font-semibold block">
            {cardNumber}
          </span>
          <span className="text-[9px] text-primary-foreground/60 font-body">{year}</span>
        </div>
      </div>

      {/* Gold accent stripe */}
      <div className="h-1.5 gold-gradient" />

      {/* Body */}
      <div className="p-4 flex gap-4 relative">
        {/* Left: Avatar + Status */}
        <div className="flex flex-col items-center gap-2 min-w-[80px]">
          <div className="h-18 w-18 rounded-full bg-primary/10 border-2 border-secondary flex items-center justify-center" style={{ width: 72, height: 72 }}>
            <span className="font-heading text-xl font-bold text-primary">{initials}</span>
          </div>
          <Badge
            variant={booking.status === "confirmed" ? "default" : "secondary"}
            className="text-[9px] capitalize px-2"
          >
            {booking.status}
          </Badge>
        </div>

        {/* Center: Info grid */}
        <div className="flex-1 min-w-0">
          <h4 className="font-heading text-base font-bold text-foreground truncate mb-2">
            {booking.full_name}
          </h4>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
            <div>
              <span className="text-muted-foreground font-medium">Reference</span>
              <p className="font-semibold text-foreground truncate">{booking.reference || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground font-medium">Package</span>
              <p className="font-semibold text-foreground truncate">{booking.package.name}</p>
            </div>
            <div>
              <span className="text-muted-foreground font-medium">Passport No.</span>
              <p className="font-semibold text-foreground">{booking.passport_number || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground font-medium">Gender</span>
              <p className="font-semibold text-foreground capitalize">{booking.gender || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground font-medium">Departure</span>
              <p className="font-semibold text-foreground">{booking.departure_city || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground font-medium">Type</span>
              <p className="font-semibold text-foreground capitalize">{booking.package.type}</p>
            </div>
          </div>
          {/* Emergency contact line */}
          <div className="mt-2 pt-1.5 border-t border-border/50 text-[10px]">
            <span className="text-muted-foreground">Emergency: </span>
            <span className="font-medium text-foreground">
              {booking.emergency_contact_name && booking.emergency_contact_phone
                ? `${booking.emergency_contact_name} (${booking.emergency_contact_phone})`
                : "Not provided"}
            </span>
          </div>
        </div>

        {/* Right: QR Code */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <div className="qr-container rounded-md p-1 bg-card border border-border/40">
            <QRCodeSVG
              value={booking.reference || booking.id}
              size={72}
              level="M"
              fgColor="hsl(162, 90%, 17%)"
              bgColor="transparent"
            />
          </div>
          <span className="text-[8px] text-muted-foreground mt-1 font-mono">
            {booking.reference || booking.id.slice(0, 8)}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="emerald-gradient px-5 py-1.5 flex items-center justify-between">
        <p className="text-[9px] text-primary-foreground/80 font-body italic">
          Your Gateway to the Holy Lands
        </p>
        <p className="text-[9px] text-primary-foreground/60 font-body">
          Kano, Nigeria
        </p>
      </div>
    </div>
  );
};

export default PilgrimIdCard;
