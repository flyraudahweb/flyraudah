export interface ProposalSection {
  title: string;
  subtitle?: string;
  paragraphs?: string[];
}

export interface FeatureSection {
  title: string;
  items: string[];
}

export interface PricingTable {
  label: string;
  headers: string[];
  rows: string[][];
  subtotal?: string[];
}

export interface TimelineItem {
  phase: string;
  task: string;
}

export interface MOUClause {
  num: number;
  title: string;
  content: string;
}

export interface ProposalData {
  // Cover
  proposalTitle: string;
  clientName: string;
  clientTitle: string;
  clientLocation: string;
  date: string;
  demoUrl?: string;

  // Executive Summary
  executiveSummary: string[];

  // Problems
  problems: { title: string; desc: string }[];

  // Feature sections (multiple pages)
  featurePages: {
    sectionTitle: string;
    subtitle?: string;
    description?: string;
    features: FeatureSection[];
    retainerBox?: { label: string; amount: string; note: string };
  }[];

  // Pricing
  pricingTables: PricingTable[];
  grandTotal: { label: string; amount: string; note: string };

  // Timeline
  timeline: TimelineItem[];

  // MOU
  mouParties: { partyA: string; partyB: string };
  mouClauses: MOUClause[];
  mouSignatories: { party: string; role: string }[];
}

// ============================================================================
// TEMPLATE 1: Raudah Travels Digital Platform
// ============================================================================
export const raudahTemplate: ProposalData = {
  proposalTitle: "Raudah Travels & Tour LTD\nDigital Platform &\nMedia Services",
  clientName: "The Chairman, Raudah Travels & Tour LTD",
  clientTitle: "Prepared For:",
  clientLocation: "Kano, Nigeria",
  date: "February 2026",
  demoUrl: "raudahtravels.lovable.app",

  executiveSummary: [
    "FADAK MEDIA HUB is pleased to present this proposal for <strong>Raudah Travels & Tour LTD</strong>, combining cutting-edge technology solutions with strategic media and branding services to transform your operations and market presence.",
    "The <strong>primary deliverable</strong> is a comprehensive digital platform that will revolutionize how Raudah manages pilgrim registrations, package bookings, payments, and agent partnerships. Complementing this, our <strong>Media & Branding services</strong> will amplify Raudah's brand visibility and customer acquisition through professional content creation and digital marketing.",
    "This dual approach ensures Raudah not only has the operational infrastructure to scale efficiently, but also the strategic visibility to dominate the competitive Hajj & Umrah market in Nigeria.",
  ],

  problems: [
    { title: "Manual Registration & Tracking", desc: "Paper-based pilgrim registration is error-prone, slow, and difficult to manage at scale." },
    { title: "No Online Booking System", desc: "Pilgrims cannot browse packages or book online, limiting reach and convenience." },
    { title: "No Digital Payment Infrastructure", desc: "Lack of integrated payment processing leads to tracking difficulties and delayed confirmations." },
    { title: "No Agent/B2B Management", desc: "Managing agent relationships, commissions, and wholesale bookings is done manually." },
    { title: "No Analytics or Reporting", desc: "Decision-making is hampered by the absence of real-time business intelligence." },
    { title: "Weak Digital Presence & Branding", desc: "Limited social media presence and no cohesive brand strategy reduces market competitiveness." },
  ],

  featurePages: [
    {
      sectionTitle: "Platform Features & Deliverables",
      subtitle: "Primary Deliverable — Comprehensive Digital Platform",
      features: [
        { title: "🕌 Public Landing Page", items: ["Hero section with cinematic visuals & parallax effects", "Package showcase with search, filtering & detailed views", "Agent/B2B application portal", "WhatsApp integration for instant support", "Multi-language support (English, Arabic, French, Hausa)", "PWA: installable & works offline"] },
        { title: "👤 Pilgrim / User Portal", items: ["Step-by-step booking wizard with real-time validation", "Online payments via Paystack (card, bank transfer, USSD)", "Document upload & management (passport, visa, vaccines)", "Booking history & payment tracking", "Profile management & support ticket system"] },
        { title: "🛡️ Admin Dashboard", items: ["Comprehensive pilgrim management with search & filters", "Package creation & lifecycle management", "Payment verification & reconciliation", "Real-time analytics & revenue dashboards", "Printable pilgrim ID tags with QR codes", "Agent application review & approval workflow", "AI-powered assistant for operational queries"] },
        { title: "🤝 Agent / B2B Portal", items: ["Client management & bulk registration", "Wholesale package booking at discounted rates", "Commission tracking & payout management", "Dedicated agent dashboard with performance metrics"] },
        { title: "💳 Payment Gateway Integration", items: ["Paystack payment gateway (Nigeria's leading processor)", "Multiple payment channels: Card, Bank Transfer, USSD", "Automated payment verification & callback handling", "Deposit/installment payment support for Hajj packages", "Payment receipts & transaction history"] },
        { title: "⚙️ Technical Infrastructure", items: ["Secure authentication with role-based access control", "PostgreSQL database with row-level security", "Real-time notifications system", "Responsive design for all devices", "SEO optimization for search engine visibility"] },
      ],
    },
    {
      sectionTitle: "Media & Branding Services",
      subtitle: "Standard Package — Comprehensive Brand Building",
      description: "The <strong>Standard Package</strong> provides the right balance of consistent brand building, dedicated campaign execution, and measurable results that Raudah needs to compete effectively in the Hajj & Umrah market. With a structured content pipeline, professional media production, and strategic marketing, this tier ensures Raudah maintains a strong, recognizable presence across all digital channels year-round.",
      features: [
        { title: "📱 Social Media Management", items: ["Content calendar planning & scheduling", "Community engagement & audience growth", "Performance analytics & monthly reporting"] },
        { title: "🎨 Content Creation", items: ["Professional graphics & branded templates", "Short-form video content (reels & stories)", "Copywriting for social media & campaigns"] },
        { title: "🎬 Video Production", items: ["Promotional video production", "Professional photoshoots for branding & marketing", "Event coverage & documentation"] },
        { title: "📈 Campaign Strategy & Execution", items: ["Digital marketing campaign development & execution", "Brand positioning & messaging strategy", "Target audience analysis & engagement planning"] },
      ],
      retainerBox: { label: "Monthly Retainer (Standard Package)", amount: "₦600,000", note: "Billed monthly · Includes all services listed above" },
    },
  ],

  pricingTables: [
    {
      label: "Part A — Digital Platform (Primary Deliverable)",
      headers: ["Item", "Cost (NGN)"],
      rows: [
        ["Backend Development (Database, Auth, APIs, Edge Functions)", "250,000"],
        ["Frontend Development (UI/UX, Components, Responsive Design)", "300,000"],
        ["Payment Gateway Integration (Paystack)", "250,000"],
        ["Feature Modules (Agent, User & Admin Portals)", "250,000"],
        ["Hosting, Backend Services & Email (1 Year)", "300,000"],
        ["Domain Registration", "50,000"],
      ],
      subtotal: ["Platform Subtotal", "₦1,400,000"],
    },
    {
      label: "Part B — Media & Branding (Standard Package)",
      headers: ["Item", "Cost (NGN)"],
      rows: [
        ["Media & Branding Standard Package", "600,000"],
      ],
    },
  ],

  grandTotal: { label: "Grand Total", amount: "₦2,000,000", note: "Platform (₦1,400,000) + Media Standard (₦600,000)" },

  timeline: [
    { phase: "Day 1–2", task: "Database design, authentication setup, backend API development" },
    { phase: "Day 2–4", task: "Frontend development: Landing page, User portal, Admin dashboard" },
    { phase: "Day 4–5", task: "Agent portal, Payment gateway integration, Document management" },
    { phase: "Day 5–6", task: "Testing, bug fixes, performance optimization" },
    { phase: "Day 6–7", task: "Deployment, domain setup, client training & handover" },
  ],

  mouParties: {
    partyA: "FADAK MEDIA HUB NIGERIA LIMITED (RC: 8426199)",
    partyB: "Raudah Travels & Tour LTD",
  },

  mouClauses: [
    { num: 1, title: "Scope of Work", content: "The Provider shall deliver: (a) A comprehensive Digital Platform including public landing page, pilgrim portal, admin dashboard, agent portal, and payment gateway integration; (b) Media & Branding services under the Standard Package including social media management, content creation, video production, and campaign strategy." },
    { num: 2, title: "Payment Terms", content: "The total project cost is ₦2,000,000 (Two Million Naira), comprising ₦1,400,000 for the Digital Platform and ₦600,000 for the Media & Branding Standard Package. Payment shall be made in two installments: 60% (₦1,200,000) upon signing of this MOU, and 40% (₦800,000) upon project completion and handover." },
    { num: 3, title: "Timeline", content: "The Provider commits to delivering the Digital Platform within 7 (seven) working days from the date of first payment. Media & Branding services commence immediately and are billed monthly thereafter." },
    { num: 4, title: "Ownership & Intellectual Property", content: "Full ownership of the Digital Platform, including source code and all associated assets, shall transfer to the Client upon receipt of full payment. The Provider retains the right to showcase the project in its portfolio unless otherwise agreed." },
    { num: 5, title: "Confidentiality", content: "Both parties agree to maintain strict confidentiality regarding all proprietary information, business strategies, and technical details shared during the course of this engagement." },
  ],

  mouSignatories: [
    { party: "For: FADAK MEDIA HUB NIGERIA LIMITED", role: "(The Provider)" },
    { party: "For: Raudah Travels & Tour LTD", role: "(The Client)" },
  ],
};

// ============================================================================
// TEMPLATE 2: Gombe State Documentary
// ============================================================================
export const gombeTemplate: ProposalData = {
  proposalTitle: "The Jewel's Transformation\nA Media Documentary on\nHuman Capital & Investment\nin Gombe State (2019–2026)",
  clientName: "His Excellency, Muhammadu Inuwa Yahaya (CON)",
  clientTitle: "Prepared For:",
  clientLocation: "Government House, Gombe, Gombe State",
  date: "2026",

  executiveSummary: [
    "Since 2019, Gombe State has undergone a radical socio-economic shift under the leadership of Governor Muhammadu Inuwa Yahaya (CON). Guided by the 10-year development plan (DEVAGOM 2021-2030), the administration has moved from \"recovery\" to \"consolidation.\"",
    "This proposal outlines a multi-platform media documentary designed to showcase Gombe as a national model for human capital development and industrial investment.",
    "Our team is prepared to deploy state-of-the-art 4K cinematography and drone technology to produce a 30-minute master documentary for national television (Channels, Arise, NTA), alongside a series of digital \"Impact Clips\" for the youth demographic on social media.",
  ],

  problems: [
    { title: "Narrative Ownership", desc: "To tell the authentic story of Gombe's progress through the eyes of its people." },
    { title: "Investment Promotion", desc: "To highlight the Muhammadu Buhari Industrial Park and Gombe's #1 PEBEC ranking to attract global investors." },
    { title: "Accountability", desc: "To provide a visual record of the 2026 \"Budget of Consolidation\" and earlier milestones." },
    { title: "Educational Resource", desc: "To serve as a case study for sub-national governance in Nigeria." },
  ],

  featurePages: [
    {
      sectionTitle: "Key Documentary Pillars",
      subtitle: "The \"Story\" Hubs",
      features: [
        { title: "🏭 Industrial Revolution", items: ["The 1,000-hectare Industrial Park", "N60bn+ in private investments", "Dadin Kowa Hydro-power link"] },
        { title: "📚 Education & Youth", items: ["Enrolling 450,000+ out-of-school children (BESDA)", "Building 1,800 classrooms", "GOSTEC youth jobs initiative"] },
        { title: "🏥 The Health Miracle", items: ["\"1-Ward-1-PHC\" project (114 centers)", "Go-Health insurance for 300,000+ citizens", "Hospital upgrades across the state"] },
        { title: "🛤️ Infrastructure", items: ["Network 11-100 project (over 1,000km of roads)", "Solar-powered street lighting across the state"] },
        { title: "👔 Civil Service Reform", items: ["Implementation of the N70,000 minimum wage", "N33bn+ clearance of gratuity arrears"] },
      ],
    },
    {
      sectionTitle: "Production Strategy & Methodology",
      subtitle: "Cinematic Storytelling Approach",
      description: "To ensure high engagement, the documentary will use a cinematic storytelling approach rather than a standard government report style.",
      features: [
        { title: "🎤 Human-Interest Interviews", items: ["Interview teachers in new classrooms", "Farmers using new roads", "Youth employed at the Industrial Park"] },
        { title: "📷 Visual Assets", items: ["4K drone cinematography of Gombe skyline", "Dadin Kowa Dam footage", "Industrial Park aerial shots"] },
        { title: "📊 Data Visualization", items: ["3D motion graphics for WAEC pass rates (22% to 70%+)", "IGR growth visualization"] },
        { title: "🌍 Multi-Language Versions", items: ["English production", "Hausa production", "Fulfulde production"] },
      ],
    },
    {
      sectionTitle: "Media Distribution Plan",
      subtitle: "\"Surround Sound\" Media Strategy",
      features: [
        { title: "📺 Television", items: ["Premiere on NTA, Channels TV, and Arise News"] },
        { title: "📱 Digital", items: ["Short \"Highlight Reels\" (60 seconds) for TikTok, Instagram, and X (Twitter)"] },
        { title: "📻 Local Reach", items: ["Broadcast on Gombe Media Corporation (GMC)", "Local radio stations coverage"] },
        { title: "🌐 International", items: ["Nigerian Diaspora forums submissions", "Investment Summit presentations"] },
      ],
    },
  ],

  pricingTables: [
    {
      label: "Projected Documentary Budget",
      headers: ["Category", "Description", "Estimated Cost (₦)"],
      rows: [
        ["1. Pre-Production", "Research, Scriptwriting (English/Hausa), and Location Scouting across Gombe", "3,500,000"],
        ["2. Production", "10–14 days shoot. Includes 4K Cameras, Drone Pilot, Lighting, and Sound Crew", "10,000,000"],
        ["3. Logistics", "Crew travel (Abuja/Lagos to Gombe), local transport, and accommodation", "4,000,000"],
        ["4. Post-Production", "Editing, 3D Data Motion Graphics, Professional Voiceover, and Color Grading", "5,000,000"],
        ["5. National Airtime", "1-time airing of 30-min documentary on Channels TV, Arise, or NTA", "20,000,000"],
        ["6. Local Media & Digital", "Airing on Gombe Media Corp (GMC) + Social Media \"Highlight\" Ads", "3,000,000"],
        ["7. Contingency", "10% for unforeseen costs (fuel, security, extra days)", "5,000,000"],
      ],
    },
    {
      label: "Cost-Benefit Summary",
      headers: ["Investment Area", "Benefit to Gombe State"],
      rows: [
        ["National Airtime", "National visibility for the \"Jewel in the Savannah\" brand"],
        ["High-End Production", "Credibility with international donors (World Bank, AfDB, etc.)"],
        ["Digital Distribution", "Engaging the youth demographic (50% of the population) via social media"],
      ],
    },
  ],

  grandTotal: { label: "Grand Total", amount: "₦50,500,000", note: "Complete documentary production, distribution, and airtime" },

  timeline: [
    { phase: "Week 1–2", task: "Pre-Production: Research, scriptwriting, and securing interview appointments" },
    { phase: "Week 3–6", task: "Production: Filming across the 11 LGAs" },
    { phase: "Week 7–9", task: "Post-Production: Editing, voiceovers, and graphics" },
    { phase: "Week 10", task: "Launch: Grand premiere and media rollout" },
  ],

  mouParties: {
    partyA: "FADAK MEDIA HUB NIGERIA LIMITED (RC: 8426199)",
    partyB: "The Gombe State Government",
  },

  mouClauses: [
    { num: 1, title: "Scope of Work", content: "The Provider shall deliver a 30-minute master documentary for national television alongside a series of digital \"Impact Clips\" for social media, covering all key pillars of the administration's achievements." },
    { num: 2, title: "Payment Terms", content: "The total project cost is ₦50,500,000 (Fifty Million, Five Hundred Thousand Naira). Payment shall be made in installments: 40% upon signing, 30% at production commencement, and 30% upon final delivery." },
    { num: 3, title: "Timeline", content: "The Provider commits to delivering the complete documentary within 10 weeks from the date of first payment." },
    { num: 4, title: "Ownership & Intellectual Property", content: "Full ownership of the documentary and all associated assets shall transfer to the Client upon receipt of full payment. The Provider retains the right to showcase the project in its portfolio." },
    { num: 5, title: "Confidentiality", content: "Both parties agree to maintain strict confidentiality regarding all proprietary information shared during the engagement." },
  ],

  mouSignatories: [
    { party: "For: FADAK MEDIA HUB NIGERIA LIMITED", role: "(The Provider)" },
    { party: "For: The Gombe State Government", role: "(The Client)" },
  ],
};

export const templateList = [
  { id: "raudah", name: "Raudah Travels Digital Platform", data: raudahTemplate },
  { id: "gombe", name: "Gombe State Documentary", data: gombeTemplate },
  { id: "custom", name: "Custom (AI Generated)", data: null },
] as const;
