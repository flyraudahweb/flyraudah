import { Printer, Download, Loader2, Mail, Globe, MapPin } from "lucide-react";
import fadakLogo from "@/assets/fadak-logo.jpg";
import teamFatima from "@/assets/team-fatima.jpg";
import teamAbubakar from "@/assets/team-abubakar.jpg";
import teamAliyu from "@/assets/team-aliyu.jpg";
import { Button } from "@/components/ui/button";
import { useRef, useState } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

const Proposal = () => {
  const proposalRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const handleDownloadPDF = async () => {
    if (!proposalRef.current || generating) return;
    setGenerating(true);
    try {
      const sections = proposalRef.current.querySelectorAll<HTMLElement>("[data-pdf-section]");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = 210;
      const pdfHeight = 297;
      const marginX = 15;
      const marginTop = 15;
      const marginBottom = 20;
      const contentWidth = pdfWidth - marginX * 2;
      const gap = 3;
      let currentY = marginTop;

      // Set fixed width for consistent rendering
      const container = proposalRef.current;
      const prevWidth = container.style.width;
      const prevMaxWidth = container.style.maxWidth;
      container.style.width = "800px";
      container.style.maxWidth = "800px";

      for (const section of sections) {
        // Temporarily add padding for clean capture (prevents letter clipping)
        const prevPadding = section.style.padding;
        section.style.padding = "8px 4px";

        const canvas = await html2canvas(section, {
          scale: 3,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        });

        // Restore original padding
        section.style.padding = prevPadding;

        const imgData = canvas.toDataURL("image/png");
        const imgHeightMm = (canvas.height * contentWidth) / canvas.width;

        const usableHeight = pdfHeight - marginTop - marginBottom;

        if (currentY + imgHeightMm > pdfHeight - marginBottom) {
          if (currentY > marginTop) {
            pdf.addPage();
          }
          currentY = marginTop;
        }

        // Handle sections taller than a full page
        if (imgHeightMm > usableHeight) {
          // Scale down to fit one page
          const scale = usableHeight / imgHeightMm;
          const scaledW = contentWidth * scale;
          const scaledH = imgHeightMm * scale;
          const offsetX = marginX + (contentWidth - scaledW) / 2;
          pdf.addImage(imgData, "PNG", offsetX, currentY, scaledW, scaledH);
          currentY += scaledH + gap;
        } else {
          pdf.addImage(imgData, "PNG", marginX, currentY, contentWidth, imgHeightMm);
          currentY += imgHeightMm + gap;
        }
      }

      // Restore container width
      container.style.width = prevWidth;
      container.style.maxWidth = prevMaxWidth;

      pdf.save("Fadak_Media_Hub_Proposal_Raudah.pdf");
    } catch (e) {
      console.error("PDF generation failed:", e);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .proposal-page { box-shadow: none !important; margin: 0 !important; max-width: none !important; min-height: auto !important; }
          .page-break { break-before: page; }
          .proposal-wrapper { padding: 0 !important; background: white !important; min-height: auto !important; }
        }
      `}</style>

      <div className="proposal-wrapper bg-muted min-h-screen py-8 print:py-0 print:bg-white">
        <div className="no-print max-w-[210mm] mx-auto mb-4 px-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button onClick={handleDownloadPDF} disabled={generating} className="gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {generating ? "Generating…" : "Download PDF"}
          </Button>
        </div>

        <div ref={proposalRef}>
          <CoverPage />
          <ExecutiveSummaryPage />
          <PlatformFeaturesPage />
          <MediaBrandingPage />
          <PricingTimelinePage />
          <MOUPage />
          <ContactTeamPage />
        </div>
      </div>
    </>
  );
};

const CoverPage = () => (
  <div className="proposal-page bg-white max-w-[210mm] mx-auto shadow-lg print:shadow-none" style={{ padding: "30mm 25mm" }}>
    <div data-pdf-section className="flex flex-col items-center text-center space-y-2">
      <img src={fadakLogo} alt="Fadak Media Hub" className="h-20 mx-auto object-contain" />
      <h2 className="text-lg font-semibold tracking-[0.3em] uppercase text-muted-foreground">FADAK MEDIA HUB NIGERIA LIMITED</h2>
      <p className="text-xs text-muted-foreground font-medium">RC: 8426199</p>
      <p className="text-sm text-muted-foreground italic">Media · Technology · Strategy</p>
    </div>

    <div data-pdf-section className="flex flex-col items-center text-center mt-8">
      <div className="border-t border-b border-[hsl(var(--secondary))] py-8 px-4 space-y-4 w-full">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Proposal</p>
        <h1 className="text-3xl md:text-4xl font-bold text-[hsl(var(--primary))]" style={{ fontFamily: "Playfair Display, serif" }}>
          Raudah Travels & Tour LTD<br />Digital Platform &<br />Media Services
        </h1>
      </div>

      <div className="space-y-2 text-sm text-muted-foreground mt-8">
        <p className="font-semibold">Prepared For:</p>
        <p className="text-foreground font-bold text-lg">The Chairman, Raudah Travels & Tour LTD</p>
        <p>Kano, Nigeria</p>
      </div>
    </div>

    <div data-pdf-section className="flex flex-col items-center text-center mt-8 space-y-2 text-sm text-muted-foreground">
      <p>February 2026</p>
      <p>Confidential</p>
      <p className="text-xs">Demo: <a href="https://raudahtravels.lovable.app" className="text-[hsl(var(--primary))] underline">raudahtravels.lovable.app</a></p>
    </div>
  </div>
);

const ExecutiveSummaryPage = () => (
  <div className="proposal-page page-break bg-white max-w-[210mm] mx-auto shadow-lg print:shadow-none" style={{ padding: "25mm" }}>
    <div data-pdf-section>
      <SectionTitle number="01" title="Executive Summary" />
      <div className="space-y-4 text-sm leading-relaxed text-foreground/90 mt-6">
        <p>
          FADAK MEDIA HUB is pleased to present this proposal for <strong>Raudah Travels & Tour LTD</strong>, combining cutting-edge technology solutions with strategic media and branding services to transform your operations and market presence.
        </p>
        <p>
          The <strong>primary deliverable</strong> is a comprehensive digital platform that will revolutionize how Raudah manages pilgrim registrations, package bookings, payments, and agent partnerships. Complementing this, our <strong>Media & Branding services</strong> will amplify Raudah's brand visibility and customer acquisition through professional content creation and digital marketing.
        </p>
        <p>
          This dual approach ensures Raudah not only has the operational infrastructure to scale efficiently, but also the strategic visibility to dominate the competitive Hajj & Umrah market in Nigeria.
        </p>
      </div>
    </div>

    <div data-pdf-section>
      <SectionTitle number="02" title="Problems Addressed" className="mt-12" />
      <div className="mt-6 space-y-3">
        {[
          { title: "Manual Registration & Tracking", desc: "Paper-based pilgrim registration is error-prone, slow, and difficult to manage at scale." },
          { title: "No Online Booking System", desc: "Pilgrims cannot browse packages or book online, limiting reach and convenience." },
          { title: "No Digital Payment Infrastructure", desc: "Lack of integrated payment processing leads to tracking difficulties and delayed confirmations." },
          { title: "No Agent/B2B Management", desc: "Managing agent relationships, commissions, and wholesale bookings is done manually." },
          { title: "No Analytics or Reporting", desc: "Decision-making is hampered by the absence of real-time business intelligence." },
          { title: "Weak Digital Presence & Branding", desc: "Limited social media presence and no cohesive brand strategy reduces market competitiveness." },
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
  </div>
);

const PlatformFeaturesPage = () => (
  <div className="proposal-page page-break bg-white max-w-[210mm] mx-auto shadow-lg print:shadow-none" style={{ padding: "25mm" }}>
    <div data-pdf-section>
      <SectionTitle number="03" title="Platform Features & Deliverables" />
      <p className="text-xs text-muted-foreground mt-2 mb-4 italic">Primary Deliverable — Comprehensive Digital Platform</p>
    </div>
    <div className="mt-4 space-y-6">
      <div data-pdf-section>
        <FeatureBlock title="🕌 Public Landing Page" items={[
          "Hero section with cinematic visuals & parallax effects",
          "Package showcase with search, filtering & detailed views",
          "Agent/B2B application portal",
          "WhatsApp integration for instant support",
          "Multi-language support (English, Arabic, French, Hausa)",
          "PWA: installable & works offline",
        ]} />
      </div>
      <div data-pdf-section>
        <FeatureBlock title="👤 Pilgrim / User Portal" items={[
          "Step-by-step booking wizard with real-time validation",
          "Online payments via Paystack (card, bank transfer, USSD)",
          "Document upload & management (passport, visa, vaccines)",
          "Booking history & payment tracking",
          "Profile management & support ticket system",
        ]} />
      </div>
      <div data-pdf-section>
        <FeatureBlock title="🛡️ Admin Dashboard" items={[
          "Comprehensive pilgrim management with search & filters",
          "Package creation & lifecycle management",
          "Payment verification & reconciliation",
          "Real-time analytics & revenue dashboards",
          "Printable pilgrim ID tags with QR codes",
          "Agent application review & approval workflow",
          "AI-powered assistant for operational queries",
        ]} />
      </div>
      <div data-pdf-section>
        <FeatureBlock title="🤝 Agent / B2B Portal" items={[
          "Client management & bulk registration",
          "Wholesale package booking at discounted rates",
          "Commission tracking & payout management",
          "Dedicated agent dashboard with performance metrics",
        ]} />
      </div>
      <div data-pdf-section>
        <FeatureBlock title="💳 Payment Gateway Integration" items={[
          "Paystack payment gateway (Nigeria's leading processor)",
          "Multiple payment channels: Card, Bank Transfer, USSD",
          "Automated payment verification & callback handling",
          "Deposit/installment payment support for Hajj packages",
          "Payment receipts & transaction history",
        ]} />
      </div>
      <div data-pdf-section>
        <FeatureBlock title="⚙️ Technical Infrastructure" items={[
          "Secure authentication with role-based access control",
          "PostgreSQL database with row-level security",
          "Real-time notifications system",
          "Responsive design for all devices",
          "SEO optimization for search engine visibility",
        ]} />
      </div>
    </div>
  </div>
);

const MediaBrandingPage = () => (
  <div className="proposal-page page-break bg-white max-w-[210mm] mx-auto shadow-lg print:shadow-none" style={{ padding: "25mm" }}>
    <div data-pdf-section>
      <SectionTitle number="04" title="Media & Branding Services" />
      <p className="text-xs text-muted-foreground mt-2 mb-4 italic">Standard Package — Comprehensive Brand Building</p>
      <div className="text-sm leading-relaxed text-foreground/90 mb-6">
        <p>
          The <strong>Standard Package</strong> provides the right balance of consistent brand building, dedicated campaign execution, and measurable results that Raudah needs to compete effectively in the Hajj & Umrah market. With a structured content pipeline, professional media production, and strategic marketing, this tier ensures Raudah maintains a strong, recognizable presence across all digital channels year-round.
        </p>
      </div>
    </div>

    <div className="space-y-6">
      <div data-pdf-section>
        <FeatureBlock title="📱 Social Media Management" items={[
          "Content calendar planning & scheduling",
          "Community engagement & audience growth",
          "Performance analytics & monthly reporting",
        ]} />
      </div>
      <div data-pdf-section>
        <FeatureBlock title="🎨 Content Creation" items={[
          "Professional graphics & branded templates",
          "Short-form video content (reels & stories)",
          "Copywriting for social media & campaigns",
        ]} />
      </div>
      <div data-pdf-section>
        <FeatureBlock title="🎬 Video Production" items={[
          "Promotional video production",
          "Professional photoshoots for branding & marketing",
          "Event coverage & documentation",
        ]} />
      </div>
      <div data-pdf-section>
        <FeatureBlock title="📈 Campaign Strategy & Execution" items={[
          "Digital marketing campaign development & execution",
          "Brand positioning & messaging strategy",
          "Target audience analysis & engagement planning",
        ]} />
      </div>
    </div>

    <div data-pdf-section className="mt-8 p-4 rounded-lg border border-dashed border-[hsl(var(--secondary))] bg-[hsl(var(--secondary))]/5">
      <p className="text-sm font-semibold text-[hsl(var(--primary))]">Monthly Retainer (Standard Package)</p>
      <p className="text-2xl font-bold mt-1 text-foreground">₦600,000</p>
      <p className="text-xs text-muted-foreground mt-1">Billed monthly · Includes all services listed above</p>
    </div>
  </div>
);

const PricingTimelinePage = () => (
  <div className="proposal-page page-break bg-white max-w-[210mm] mx-auto shadow-lg print:shadow-none" style={{ padding: "25mm" }}>
    <div data-pdf-section>
      <SectionTitle number="05" title="Pricing Breakdown" />
      <div className="mt-6">
        <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Part A — Digital Platform (Primary Deliverable)</p>
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
              ["Frontend Development (UI/UX, Components, Responsive Design)", "300,000"],
              ["Payment Gateway Integration (Paystack)", "250,000"],
              ["Feature Modules (Agent, User & Admin Portals)", "250,000"],
              ["Hosting, Backend Services & Email (1 Year)", "300,000"],
              ["Domain Registration", "50,000"],
            ].map(([item, cost], i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-muted/50" : ""}>
                <td className="py-3 px-4 border-b border-border">{item}</td>
                <td className="py-3 px-4 border-b border-border text-right font-medium">₦{cost}</td>
              </tr>
            ))}
            <tr className="font-bold">
              <td className="py-3 px-4 border-b border-border">Platform Subtotal</td>
              <td className="py-3 px-4 border-b border-border text-right">₦1,400,000</td>
            </tr>
          </tbody>
        </table>

        <p className="text-xs font-bold text-muted-foreground mb-2 mt-8 uppercase tracking-wider">Part B — Media & Branding (Standard Package)</p>
        <table className="w-full text-sm border-collapse">
          <tbody>
            <tr className="bg-muted/50">
              <td className="py-3 px-4 border-b border-border">Media & Branding Standard Package</td>
              <td className="py-3 px-4 border-b border-border text-right font-medium">₦600,000</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-6 p-4 rounded-lg bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/20">
          <div className="flex justify-between items-center">
            <span className="font-bold text-lg text-[hsl(var(--primary))]">Grand Total</span>
            <span className="font-bold text-xl text-[hsl(var(--primary))]">₦2,000,000</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Platform (₦1,400,000) + Media Standard (₦600,000)</p>
        </div>
      </div>
    </div>

    <div data-pdf-section>
      <SectionTitle number="06" title="Project Timeline" className="mt-14" />
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
    </div>
  </div>
);

const SectionTitle = ({ number, title, className = "" }: { number: string; title: string; className?: string }) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <span className="text-xs font-bold text-[hsl(var(--secondary))] bg-[hsl(var(--secondary))]/10 rounded-full w-8 h-8 flex items-center justify-center">{number}</span>
    <h2 className="text-xl font-bold text-[hsl(var(--primary))]" style={{ fontFamily: "Playfair Display, serif" }}>{title}</h2>
  </div>
);

const MOUPage = () => (
  <div className="proposal-page page-break bg-white max-w-[210mm] mx-auto shadow-lg print:shadow-none" style={{ padding: "25mm" }}>
    <div data-pdf-section>
      <SectionTitle number="07" title="Memorandum of Understanding (MOU)" />
      <p className="text-xs text-muted-foreground mt-2 mb-6 italic">This Memorandum of Understanding sets forth the terms agreed upon by both parties.</p>

      <div className="space-y-1 text-sm leading-relaxed text-foreground/90">
        <p className="font-semibold">Parties:</p>
        <p><strong>Party A:</strong> FADAK MEDIA HUB NIGERIA LIMITED (RC: 8426199), hereinafter referred to as "the Provider"</p>
        <p><strong>Party B:</strong> Raudah Travels & Tour LTD, hereinafter referred to as "the Client"</p>
      </div>
    </div>

    {[
      {
        num: 1,
        title: "Scope of Work",
        content: "The Provider shall deliver: (a) A comprehensive Digital Platform including public landing page, pilgrim portal, admin dashboard, agent portal, and payment gateway integration; (b) Media & Branding services under the Standard Package including social media management, content creation, video production, and campaign strategy."
      },
      {
        num: 2,
        title: "Payment Terms",
        content: "The total project cost is ₦2,000,000 (Two Million Naira), comprising ₦1,400,000 for the Digital Platform and ₦600,000 for the Media & Branding Standard Package. Payment shall be made in two installments: 60% (₦1,200,000) upon signing of this MOU, and 40% (₦800,000) upon project completion and handover."
      },
      {
        num: 3,
        title: "Timeline",
        content: "The Provider commits to delivering the Digital Platform within 7 (seven) working days from the date of first payment. Media & Branding services commence immediately and are billed monthly thereafter."
      },
      {
        num: 4,
        title: "Ownership & Intellectual Property",
        content: "Full ownership of the Digital Platform, including source code and all associated assets, shall transfer to the Client upon receipt of full payment. The Provider retains the right to showcase the project in its portfolio unless otherwise agreed."
      },
    ].map((clause) => (
      <div data-pdf-section key={clause.num} className="mt-4">
        <div className="flex gap-3 items-start">
          <div className="w-6 h-6 rounded-full bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{clause.num}</div>
          <div>
            <p className="font-semibold text-sm">{clause.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{clause.content}</p>
          </div>
        </div>
      </div>
    ))}

    <div data-pdf-section className="mt-6">
      <div className="flex gap-3 items-start">
        <div className="w-6 h-6 rounded-full bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">5</div>
        <div>
          <p className="font-semibold text-sm">Confidentiality</p>
          <p className="text-xs text-muted-foreground mt-1">Both parties agree to maintain strict confidentiality regarding all proprietary information, business strategies, and technical details shared during the course of this engagement.</p>
        </div>
      </div>
    </div>

    <div data-pdf-section className="mt-12">
      <p className="text-sm font-semibold mb-8">IN WITNESS WHEREOF, the parties have executed this Memorandum of Understanding as of the date set forth below.</p>
      <div className="grid grid-cols-2 gap-12">
        {[
          { party: "For: FADAK MEDIA HUB NIGERIA LIMITED", role: "(The Provider)" },
          { party: "For: Raudah Travels & Tour LTD", role: "(The Client)" },
        ].map((side, i) => (
          <div key={i} className="space-y-6">
            <p className="font-semibold text-sm">{side.party}</p>
            <p className="text-xs text-muted-foreground">{side.role}</p>
            <div className="space-y-4 mt-4">
              <div className="border-b border-foreground/30 pb-1">
                <p className="text-[10px] text-muted-foreground">Signature</p>
              </div>
              <div className="border-b border-foreground/30 pb-1">
                <p className="text-[10px] text-muted-foreground">Name</p>
              </div>
              <div className="border-b border-foreground/30 pb-1">
                <p className="text-[10px] text-muted-foreground">Title</p>
              </div>
              <div className="border-b border-foreground/30 pb-1">
                <p className="text-[10px] text-muted-foreground">Date</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

  </div>
);

const ContactTeamPage = () => (
  <div className="proposal-page page-break bg-white max-w-[210mm] mx-auto shadow-lg print:shadow-none" style={{ padding: "25mm" }}>
    <div data-pdf-section>
      <SectionTitle number="08" title="Contact & Team" />
      <div className="mt-6 space-y-4">
        {[
          { name: "Fatima Dauda Kurfi", role: "CHIEF EXECUTIVE DIRECTOR, FADAK MEDIA HUB", phone: "09160628769", photo: teamFatima },
          { name: "Abubakar Lawal Abba", role: "PROJECT LEAD", phone: "07034681817", photo: teamAbubakar },
          { name: "Aliyu Wada Umar", role: "PROJECT TECHNICAL DIRECTOR", phone: "09063412927", photo: teamAliyu },
        ].map((person, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-border">
            <img src={person.photo} alt={person.name} className="w-20 h-20 rounded-full object-cover flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">{person.name}</p>
              <p className="text-xs text-muted-foreground">{person.role}</p>
            </div>
            <p className="ml-auto text-sm font-mono">{person.phone}</p>
          </div>
        ))}
      </div>
    </div>

    <div data-pdf-section>
      <div className="mt-6 p-4 rounded-lg bg-muted/50 space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span>fadakmediacompany@gmail.com</span>
        </div>
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span>www.fadakmediahub.com</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>No 15 NNPC Plaza, WTC Roundabout, Katsina, Katsina State</span>
        </div>
      </div>
    </div>

    <div data-pdf-section>
      <div className="mt-16 pt-6 border-t border-border text-center text-xs text-muted-foreground space-y-1">
        <p className="font-semibold">FADAK MEDIA HUB NIGERIA LIMITED · RC: 8426199</p>
        <p>This proposal is confidential and intended solely for the addressee.</p>
        <p>Demo: <a href="https://raudahtravels.lovable.app" className="text-[hsl(var(--primary))] underline">raudahtravels.lovable.app</a></p>
        <p>© 2026 FADAK MEDIA HUB NIGERIA LIMITED. All rights reserved.</p>
      </div>
    </div>
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
