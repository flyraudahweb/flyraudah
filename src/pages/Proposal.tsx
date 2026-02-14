import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

const Proposal = () => {
  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          .proposal-page { box-shadow: none !important; margin: 0 !important; }
          .page-break { break-before: page; }
        }
      `}</style>

      <div className="bg-muted min-h-screen py-8 print:py-0 print:bg-white">
        {/* Print Button */}
        <div className="no-print max-w-[210mm] mx-auto mb-4 px-4 flex justify-end">
          <Button onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" /> Print / Save PDF
          </Button>
        </div>

        {/* ===== COVER PAGE ===== */}
        <div className="proposal-page bg-white max-w-[210mm] mx-auto shadow-lg print:shadow-none" style={{ minHeight: "297mm", padding: "40mm 25mm" }}>
          <div className="flex flex-col items-center justify-center h-full text-center space-y-8">
            <div className="space-y-2">
              <div className="w-20 h-20 mx-auto rounded-full bg-[hsl(var(--primary))] flex items-center justify-center text-white font-bold text-2xl" style={{ fontFamily: "Playfair Display, serif" }}>
                BI
              </div>
              <h2 className="text-lg font-semibold tracking-[0.3em] uppercase text-muted-foreground">BINAH INNOVATION LTD</h2>
              <p className="text-sm text-muted-foreground">RC Number: [To be provided]</p>
            </div>

            <div className="border-t border-b border-[hsl(var(--secondary))] py-8 px-4 space-y-4 my-8">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Software Development Proposal</p>
              <h1 className="text-3xl md:text-4xl font-bold text-[hsl(var(--primary))]" style={{ fontFamily: "Playfair Display, serif" }}>
                Raudah Hajj & Umrah<br />Digital Platform
              </h1>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-semibold">Prepared For:</p>
              <p className="text-foreground font-bold text-lg">The Chairman, Raudah Hajj & Umrah</p>
              <p>Kano, Nigeria</p>
            </div>

            <div className="space-y-1 text-sm text-muted-foreground mt-auto">
              <p>February 2026</p>
              <p>Confidential</p>
            </div>
          </div>
        </div>

        {/* ===== EXECUTIVE SUMMARY ===== */}
        <div className="proposal-page page-break bg-white max-w-[210mm] mx-auto shadow-lg print:shadow-none" style={{ minHeight: "297mm", padding: "25mm" }}>
          <SectionTitle number="01" title="Executive Summary" />
          <div className="space-y-4 text-sm leading-relaxed text-foreground/90 mt-6">
            <p>
              BINAH INNOVATION LTD is pleased to present this proposal for the design, development, and deployment of a comprehensive digital platform for <strong>Raudah Hajj & Umrah</strong>. This platform will revolutionize how Raudah manages pilgrim registrations, package bookings, payments, and agent partnerships.
            </p>
            <p>
              In today's competitive Hajj & Umrah industry, organizations that lack a digital presence face significant challenges in scaling operations, maintaining transparency, and delivering a premium experience to pilgrims. Our proposed solution addresses these challenges head-on.
            </p>
          </div>

          <SectionTitle number="02" title="Problems Addressed" className="mt-12" />
          <div className="mt-6 space-y-3">
            {[
              { title: "Manual Registration & Tracking", desc: "Paper-based pilgrim registration is error-prone, slow, and difficult to manage at scale." },
              { title: "No Online Booking System", desc: "Pilgrims cannot browse packages or book online, limiting reach and convenience." },
              { title: "No Digital Payment Infrastructure", desc: "Lack of integrated payment processing leads to tracking difficulties and delayed confirmations." },
              { title: "No Agent/B2B Management", desc: "Managing agent relationships, commissions, and wholesale bookings is done manually." },
              { title: "No Analytics or Reporting", desc: "Decision-making is hampered by the absence of real-time business intelligence." },
              { title: "Paper-Based Document Management", desc: "Passports, visas, vaccination certificates, and other documents are managed physically, risking loss or damage." },
            ].map((item, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-destructive/10 text-destructive flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</div>
                <div>
                  <p className="font-semibold text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== FEATURES & DELIVERABLES ===== */}
        <div className="proposal-page page-break bg-white max-w-[210mm] mx-auto shadow-lg print:shadow-none" style={{ minHeight: "297mm", padding: "25mm" }}>
          <SectionTitle number="03" title="Features & Deliverables" />
          <div className="mt-6 space-y-6">
            <FeatureBlock title="🕌 Public Landing Page" items={[
              "Hero section with cinematic visuals & parallax effects",
              "Package showcase with search, filtering & detailed views",
              "Agent/B2B application portal",
              "WhatsApp integration for instant support",
              "Multi-language support (English, Arabic, French, Hausa)",
              "PWA: installable & works offline",
            ]} />
            <FeatureBlock title="👤 Pilgrim / User Portal" items={[
              "Step-by-step booking wizard with real-time validation",
              "Online payments via Paystack (card, bank transfer, USSD)",
              "Document upload & management (passport, visa, vaccines)",
              "Booking history & payment tracking",
              "Profile management & support ticket system",
            ]} />
            <FeatureBlock title="🛡️ Admin Dashboard" items={[
              "Comprehensive pilgrim management with search & filters",
              "Package creation & lifecycle management",
              "Payment verification & reconciliation",
              "Real-time analytics & revenue dashboards",
              "Printable pilgrim ID tags with QR codes",
              "Agent application review & approval workflow",
              "AI-powered assistant for operational queries",
            ]} />
            <FeatureBlock title="🤝 Agent / B2B Portal" items={[
              "Client management & bulk registration",
              "Wholesale package booking at discounted rates",
              "Commission tracking & payout management",
              "Dedicated agent dashboard with performance metrics",
            ]} />
            <FeatureBlock title="💳 Payment Gateway Integration" items={[
              "Paystack payment gateway (Nigeria's leading processor)",
              "Multiple payment channels: Card, Bank Transfer, USSD",
              "Server-side secure transaction initialization",
              "Automated payment verification & callback handling",
              "Deposit/installment payment support for Hajj packages",
              "Manual bank transfer verification (WEMA Bank)",
              "Payment receipts & transaction history",
              "Real-time payment status tracking & notifications",
            ]} />
            <FeatureBlock title="⚙️ Technical Infrastructure" items={[
              "Secure authentication with role-based access control",
              "PostgreSQL database with row-level security",
              "Real-time notifications system",
              "Responsive design for all devices (mobile, tablet, desktop)",
              "SEO optimization for search engine visibility",
            ]} />
          </div>
        </div>

        {/* ===== PRICING & TIMELINE ===== */}
        <div className="proposal-page page-break bg-white max-w-[210mm] mx-auto shadow-lg print:shadow-none" style={{ minHeight: "297mm", padding: "25mm" }}>
          <SectionTitle number="04" title="Pricing Breakdown" />
          <div className="mt-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[hsl(var(--primary))] text-white">
                  <th className="text-left py-3 px-4 font-semibold">Item</th>
                  <th className="text-right py-3 px-4 font-semibold">Cost (NGN)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Backend Development (Database, Auth, APIs, Edge Functions)", "250,000"],
                  ["Frontend Development (UI/UX, Components, Responsive Design)", "310,000"],
                  ["Payment Gateway Integration (Paystack)", "500,000"],
                  ["Feature Modules (Agent, User & Admin Portals)", "260,000 – 290,000"],
                  ["Hosting, Backend Services & Email (1 Year)", "480,000"],
                  ["Domain Registration", "50,000"],
                ].map(([item, cost], i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-muted/50" : ""}>
                    <td className="py-3 px-4 border-b border-border">{item}</td>
                    <td className="py-3 px-4 border-b border-border text-right font-medium">₦{cost}</td>
                  </tr>
                ))}
                <tr className="bg-[hsl(var(--secondary))]/10 font-bold">
                  <td className="py-3 px-4 text-[hsl(var(--primary))]">Total</td>
                  <td className="py-3 px-4 text-right text-[hsl(var(--primary))]">₦1,850,000 – ₦1,880,000</td>
                </tr>
              </tbody>
            </table>
          </div>

          <SectionTitle number="05" title="Project Timeline" className="mt-14" />
          <div className="mt-6 space-y-3">
            {[
              { phase: "Day 1–2", task: "Database design, authentication setup, backend API development" },
              { phase: "Day 2–4", task: "Frontend development: Landing page, User portal, Admin dashboard" },
              { phase: "Day 4–5", task: "Agent portal, Payment gateway integration, Document management" },
              { phase: "Day 5–6", task: "Testing, bug fixes, performance optimization" },
              { phase: "Day 6–7", task: "Deployment, domain setup, client training & handover" },
            ].map((item, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded-md px-3 py-1 text-xs font-bold flex-shrink-0 min-w-[70px] text-center">
                  {item.phase}
                </div>
                <p className="text-sm pt-0.5">{item.task}</p>
              </div>
            ))}
          </div>

          <SectionTitle number="06" title="Contact Information" className="mt-14" />
          <div className="mt-6 space-y-4">
            {[
              { name: "Fatima Dauda Kurfi", role: "PROJECT DIRECTOR", phone: "09160628769" },
              { name: "Abubakar Lawal Abba", role: "PROJECT LEAD", phone: "07034681817" },
              { name: "Aliyu Wada Umar", role: "PROJECT TECHNICAL DIRECTOR", phone: "09063412927" },
            ].map((person, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-border">
                <div className="w-10 h-10 rounded-full bg-[hsl(var(--primary))] text-white flex items-center justify-center font-bold text-sm">
                  {person.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <p className="font-semibold text-sm">{person.name}</p>
                  <p className="text-xs text-muted-foreground">{person.role}</p>
                </div>
                <p className="ml-auto text-sm font-mono">{person.phone}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 pt-6 border-t border-border text-center text-xs text-muted-foreground space-y-1">
            <p className="font-semibold">BINAH INNOVATION LTD</p>
            <p>This proposal is confidential and intended solely for the addressee.</p>
            <p>© 2026 BINAH INNOVATION LTD. All rights reserved.</p>
          </div>
        </div>
      </div>
    </>
  );
};

const SectionTitle = ({ number, title, className = "" }: { number: string; title: string; className?: string }) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <span className="text-xs font-bold text-[hsl(var(--secondary))] bg-[hsl(var(--secondary))]/10 rounded-full w-8 h-8 flex items-center justify-center">{number}</span>
    <h2 className="text-xl font-bold text-[hsl(var(--primary))]" style={{ fontFamily: "Playfair Display, serif" }}>{title}</h2>
  </div>
);

const FeatureBlock = ({ title, items }: { title: string; items: string[] }) => (
  <div>
    <h3 className="font-semibold text-sm mb-2">{title}</h3>
    <ul className="grid grid-cols-1 gap-1 text-xs text-muted-foreground">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 items-start">
          <span className="text-[hsl(var(--secondary))] mt-0.5">✓</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

export default Proposal;
