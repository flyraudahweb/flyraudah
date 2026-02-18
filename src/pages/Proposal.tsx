import { Printer, Download, Loader2, Mail, Globe, MapPin, Upload, FileText, Sparkles } from "lucide-react";
import fadakLogo from "@/assets/fadak-logo.jpg";
import teamFatima from "@/assets/team-fatima.jpg";
import teamAbubakar from "@/assets/team-abubakar.jpg";
import teamAliyu from "@/assets/team-aliyu.jpg";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRef, useState } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { type ProposalData, templateList, raudahTemplate } from "@/data/proposalTemplates";
import { supabase } from "@/integrations/supabase/client";

const Proposal = () => {
  const proposalRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
  const [showTeam, setShowTeam] = useState(true);
  const [showMOU, setShowMOU] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("raudah");
  const [proposalData, setProposalData] = useState<ProposalData>(raudahTemplate);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTemplateChange = (value: string) => {
    setSelectedTemplate(value);
    const tmpl = templateList.find((t) => t.id === value);
    if (tmpl && tmpl.data) {
      setProposalData(tmpl.data);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "application/pdf") {
      // Read as text — basic extraction
      const reader = new FileReader();
      reader.onload = async () => {
        const text = reader.result as string;
        // For PDF, we'll try to extract text content
        // The ArrayBuffer approach gets raw bytes; we send them as-is
        setAiText(`[PDF Content from: ${file.name}]\n\n${text.substring(0, 15000)}`);
        toast.success(`File "${file.name}" loaded. Click "Generate with AI" to process.`);
      };
      reader.readAsText(file);
    } else {
      // Plain text files
      const reader = new FileReader();
      reader.onload = () => {
        setAiText(reader.result as string);
        toast.success(`File "${file.name}" loaded.`);
      };
      reader.readAsText(file);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAIGenerate = async () => {
    if (!aiText.trim() || aiText.trim().length < 20) {
      toast.error("Please paste more text or upload a document first.");
      return;
    }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-proposal", {
        body: { text: aiText },
      });

      if (error) {
        // Check for rate limit / payment errors
        if (error.message?.includes("429")) {
          toast.error("Rate limit exceeded. Please wait a moment and try again.");
        } else if (error.message?.includes("402")) {
          toast.error("AI credits exhausted. Please add funds to continue.");
        } else {
          toast.error(error.message || "Failed to generate proposal.");
        }
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setProposalData(data as ProposalData);
      toast.success("Proposal generated successfully!");
    } catch (err) {
      console.error("AI generation error:", err);
      toast.error("Failed to generate proposal. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!proposalRef.current || generating) return;
    setGenerating(true);
    const globalStyle = document.createElement("style");
    globalStyle.id = "pdf-capture-override";
    globalStyle.textContent = `
      [data-pdf-section] { margin-top: 0 !important; margin-bottom: 0 !important; }
      [data-pdf-section] > * { margin-top: 0 !important; }
    `;

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

      const container = proposalRef.current;
      const prevWidth = container.style.width;
      const prevMaxWidth = container.style.maxWidth;
      container.style.width = "800px";
      container.style.maxWidth = "800px";

      // Inject style to strip margins from sections & their direct children
      // This prevents blank whitespace being captured in the canvas
      document.head.appendChild(globalStyle);

      for (const section of sections) {
        const canvas = await html2canvas(section, {
          scale: 3,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: 800,
        });

        const imgData = canvas.toDataURL("image/png");
        const imgHeightMm = (canvas.height * contentWidth) / canvas.width;
        const usableHeight = pdfHeight - marginTop - marginBottom;

        if (currentY + imgHeightMm > pdfHeight - marginBottom) {
          if (currentY > marginTop) pdf.addPage();
          currentY = marginTop;
        }

        if (imgHeightMm > usableHeight) {
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

      container.style.width = prevWidth;
      container.style.maxWidth = prevMaxWidth;

      pdf.save("Fadak_Media_Hub_Proposal.pdf");
    } catch (e) {
      console.error("PDF generation failed:", e);
    } finally {
      // Always clean up the injected style
      if (document.head.contains(globalStyle)) {
        document.head.removeChild(globalStyle);
      }
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
        {/* Controls Bar */}
        <div className="no-print max-w-[210mm] mx-auto mb-4 px-4 space-y-4">
          {/* Template Selector */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templateList.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch id="show-mou" checked={showMOU} onCheckedChange={setShowMOU} />
              <Label htmlFor="show-mou" className="text-sm cursor-pointer whitespace-nowrap">Include MOU</Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch id="show-team" checked={showTeam} onCheckedChange={setShowTeam} />
              <Label htmlFor="show-team" className="text-sm cursor-pointer whitespace-nowrap">Include Team</Label>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
                <Printer className="h-3.5 w-3.5" /> Print
              </Button>
              <Button size="sm" onClick={handleDownloadPDF} disabled={generating} className="gap-1.5">
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                {generating ? "Generating…" : "PDF"}
              </Button>
            </div>
          </div>

          {/* AI Generator Panel — shown when "custom" is selected */}
          {selectedTemplate === "custom" && (
            <div className="p-4 rounded-lg border border-dashed border-[hsl(var(--primary))]/30 bg-background space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[hsl(var(--primary))]">
                <Sparkles className="h-4 w-4" />
                AI Proposal Generator
              </div>
              <p className="text-xs text-muted-foreground">
                Upload a PDF or paste text below, then click "Generate" to create a structured proposal using AI.
              </p>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.doc,.docx"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
                  <Upload className="h-3.5 w-3.5" /> Upload File
                </Button>
              </div>
              <Textarea
                placeholder="Or paste your proposal content here..."
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                className="min-h-[120px] text-xs"
              />
              <Button onClick={handleAIGenerate} disabled={aiLoading} className="gap-1.5 w-full">
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {aiLoading ? "Generating proposal..." : "Generate with AI"}
              </Button>
            </div>
          )}
        </div>

        {/* Proposal Content */}
        <div ref={proposalRef}>
          <CoverPage data={proposalData} />
          <ExecutiveSummaryPage data={proposalData} />
          {proposalData.featurePages.map((page, idx) => (
            <FeaturePage key={idx} sectionNumber={String(idx + 3).padStart(2, "0")} page={page} />
          ))}
          <PricingTimelinePage data={proposalData} sectionStart={proposalData.featurePages.length + 3} />
          {proposalData.appendixSections && proposalData.appendixSections.length > 0 && (
            <AppendixPage
              sections={proposalData.appendixSections}
              sectionStart={proposalData.featurePages.length + 5}
            />
          )}
          {showMOU && (
            <MOUPage
              data={proposalData}
              sectionNumber={String(
                proposalData.featurePages.length + 4 + (proposalData.appendixSections?.length ? 1 : 0)
              ).padStart(2, "0")}
            />
          )}
          <ContactTeamPage
            showTeam={showTeam}
            sectionNumber={String(
              proposalData.featurePages.length + 5 + (proposalData.appendixSections?.length ? 1 : 0)
            ).padStart(2, "0")}
          />
        </div>
      </div>
    </>
  );
};

// ============================================================================
// Sub-components — all data-driven
// ============================================================================

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

const CoverPage = ({ data }: { data: ProposalData }) => (
  <div data-pdf-section className="proposal-page bg-white max-w-[210mm] mx-auto shadow-lg print:shadow-none" style={{ padding: "20mm 25mm" }}>
    <div>
      {/* Fixed Letterhead */}
      <div className="flex flex-col items-center text-center space-y-2">
        <img src={fadakLogo} alt="Fadak Media Hub" className="h-20 mx-auto object-contain" />
        <h2 className="text-lg font-semibold tracking-[0.3em] uppercase text-muted-foreground">FADAK MEDIA HUB NIGERIA LIMITED</h2>
        <p className="text-xs text-muted-foreground font-medium">RC: 8426199</p>
        <p className="text-sm text-muted-foreground italic">Media · Technology · Strategy</p>
      </div>

      {/* Optional: Formal Letter Address Block */}
      {data.coverLetter && (
        <div className="mt-8 text-left space-y-3 text-sm leading-relaxed border-t border-border pt-6">
          {data.coverLetter.date && (
            <p className="text-foreground/80">Date: <span className="font-semibold">{data.coverLetter.date}</span></p>
          )}
          <div className="mt-2 space-y-0.5">
            {data.coverLetter.recipient.split("\n").map((line, i) => (
              <p key={i} className="font-semibold text-foreground">{line}</p>
            ))}
            {data.coverLetter.address && <p className="text-foreground/80">{data.coverLetter.address}</p>}
          </div>
          {data.coverLetter.attention && (
            <p className="mt-2"><span className="font-semibold">Attention:</span> {data.coverLetter.attention}</p>
          )}
          {data.coverLetter.salutation && (
            <p className="mt-1 font-semibold">{data.coverLetter.salutation}</p>
          )}
          {data.coverLetter.subject && (
            <p className="mt-2 font-bold uppercase text-xs tracking-wide text-[hsl(var(--primary))]">{data.coverLetter.subject}</p>
          )}
          {data.coverLetter.body && (
            <div className="mt-3 space-y-3 text-sm text-foreground/80">
              {data.coverLetter.body.split("\n\n").map((para, i) => (
                <p key={i} style={{ whiteSpace: "pre-line" }}>{para}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Proposal Title Block */}
      <div className="flex flex-col items-center text-center mt-8">
        <div className="border-t border-b border-[hsl(var(--secondary))] py-8 px-4 space-y-4 w-full">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Proposal</p>
          <h1 className="text-3xl md:text-4xl font-bold text-[hsl(var(--primary))]" style={{ fontFamily: "Playfair Display, serif", whiteSpace: "pre-line" }}>
            {data.proposalTitle}
          </h1>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground mt-8">
          <p className="font-semibold">{data.clientTitle}</p>
          <p className="text-foreground font-bold text-lg">{data.clientName}</p>
          <p>{data.clientLocation}</p>
        </div>
      </div>

      <div className="flex flex-col items-center text-center mt-8 space-y-2 text-sm text-muted-foreground">
        <p>{data.date}</p>
        <p>Confidential</p>
        {data.demoUrl && (
          <p className="text-xs">Demo: <a href={`https://${data.demoUrl}`} className="text-[hsl(var(--primary))] underline">{data.demoUrl}</a></p>
        )}
      </div>
    </div>
  </div>
);

const ExecutiveSummaryPage = ({ data }: { data: ProposalData }) => (
  <div className="proposal-page page-break bg-white max-w-[210mm] mx-auto shadow-lg print:shadow-none" style={{ padding: "25mm" }}>
    <div data-pdf-section>
      <SectionTitle number="01" title="Executive Summary" />
      <div className="space-y-4 text-sm leading-relaxed text-foreground/90 mt-6">
        {data.executiveSummary.map((p, i) => (
          <p key={i} dangerouslySetInnerHTML={{ __html: p }} />
        ))}
      </div>
    </div>

    <div data-pdf-section>
      <SectionTitle number="02" title="Objectives / Problems Addressed" className="mt-12" />
      <div className="mt-6 space-y-3">
        {data.problems.map((item, i) => (
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

const FeaturePage = ({ sectionNumber, page }: { sectionNumber: string; page: ProposalData["featurePages"][number] }) => (
  <div className="proposal-page page-break bg-white max-w-[210mm] mx-auto shadow-lg print:shadow-none" style={{ padding: "25mm" }}>
    <div data-pdf-section>
      <SectionTitle number={sectionNumber} title={page.sectionTitle} />
      {page.subtitle && <p className="text-xs text-muted-foreground mt-2 mb-4 italic">{page.subtitle}</p>}
      {page.description && (
        <div className="text-sm leading-relaxed text-foreground/90 mb-6">
          <p dangerouslySetInnerHTML={{ __html: page.description }} />
        </div>
      )}
    </div>

    {page.tableView ? (
      /* ── Table view: Pillar | Key Highlights ── */
      <div data-pdf-section className="mt-4 overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
              <th className="px-4 py-3 text-left font-semibold w-[35%]">Pillar</th>
              <th className="px-4 py-3 text-left font-semibold">Key Highlights to Feature</th>
            </tr>
          </thead>
          <tbody>
            {page.features.map((feature, i) => (
              <tr
                key={i}
                style={{ background: i % 2 === 0 ? "hsl(var(--muted))" : "white" }}
              >
                <td className="px-4 py-3 font-semibold text-[hsl(var(--primary))] align-top">{feature.title}</td>
                <td className="px-4 py-3 text-foreground/80 align-top">{feature.items.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      /* ── Default bullet-block view ── */
      <div className="mt-4 space-y-6">
        {page.features.map((feature, i) => (
          <div data-pdf-section key={i}>
            <FeatureBlock title={feature.title} items={feature.items} />
          </div>
        ))}
      </div>
    )}

    {page.retainerBox && (
      <div data-pdf-section className="mt-8 p-4 rounded-lg border border-dashed border-[hsl(var(--secondary))] bg-[hsl(var(--secondary))]/5">
        <p className="text-sm font-semibold text-[hsl(var(--primary))]">{page.retainerBox.label}</p>
        <p className="text-2xl font-bold mt-1 text-foreground">{page.retainerBox.amount}</p>
        <p className="text-xs text-muted-foreground mt-1">{page.retainerBox.note}</p>
      </div>
    )}
  </div>
);

const PricingTimelinePage = ({ data, sectionStart }: { data: ProposalData; sectionStart: number }) => (
  <div className="proposal-page page-break bg-white max-w-[210mm] mx-auto shadow-lg print:shadow-none" style={{ padding: "25mm" }}>
    <div data-pdf-section>
      <SectionTitle number={String(sectionStart).padStart(2, "0")} title="Pricing Breakdown" />
      <div className="mt-6 space-y-8">
        {data.pricingTables.map((table, ti) => (
          <div key={ti}>
            <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">{table.label}</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[hsl(var(--primary))] text-white">
                  {table.headers.map((h, hi) => (
                    <th key={hi} className={`py-3 px-4 font-semibold ${hi === table.headers.length - 1 ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? "bg-muted/50" : ""}>
                    {row.map((cell, ci) => (
                      <td key={ci} className={`py-3 px-4 border-b border-border ${ci === row.length - 1 ? "text-right font-medium" : ""}`}>
                        {ci === row.length - 1 && !cell.startsWith("₦") && !cell.includes("benefit") && /[\d,]+/.test(cell) ? `₦${cell}` : cell}
                      </td>
                    ))}
                  </tr>
                ))}
                {table.subtotal && (
                  <tr className="font-bold">
                    {table.subtotal.map((cell, ci) => (
                      <td key={ci} className={`py-3 px-4 border-b border-border ${ci === table.subtotal!.length - 1 ? "text-right" : ""}`} colSpan={ci === 0 ? table.headers.length - 1 : 1}>{cell}</td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ))}

        <div className="p-4 rounded-lg bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/20">
          <div className="flex justify-between items-center">
            <span className="font-bold text-lg text-[hsl(var(--primary))]">{data.grandTotal.label}</span>
            <span className="font-bold text-xl text-[hsl(var(--primary))]">{data.grandTotal.amount}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{data.grandTotal.note}</p>
        </div>
      </div>
    </div>

    <div data-pdf-section>
      <SectionTitle number={String(sectionStart + 1).padStart(2, "0")} title="Project Timeline" className="mt-14" />
      <div className="mt-6 space-y-3">
        {data.timeline.map((item, i) => (
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

const AppendixPage = ({
  sections,
  sectionStart,
}: {
  sections: NonNullable<ProposalData["appendixSections"]>;
  sectionStart: number;
}) => (
  <>
    {sections.map((section, idx) => (
      <div key={idx} className="proposal-page page-break bg-white max-w-[210mm] mx-auto shadow-lg print:shadow-none" style={{ padding: "25mm" }}>
        <div data-pdf-section>
          <SectionTitle number={String(sectionStart + idx).padStart(2, "0")} title={section.title} />
          {section.body && (
            <div className="mt-6 space-y-3 text-sm leading-relaxed text-foreground/90">
              {section.body.split("\n\n").map((para, pi) => (
                <p key={pi} style={{ whiteSpace: "pre-line" }}>{para}</p>
              ))}
            </div>
          )}
        </div>
        {section.subSections && section.subSections.length > 0 && (
          <div className="mt-6 space-y-6">
            {section.subSections.map((sub, si) => (
              <div data-pdf-section key={si} className="pl-4 border-l-2 border-[hsl(var(--secondary))]">
                <p className="font-bold text-sm text-[hsl(var(--primary))] mb-2">{sub.heading}</p>
                <div className="space-y-2 text-sm text-foreground/80">
                  {sub.content.split("\n\n").map((para, pi) => (
                    <p key={pi} style={{ whiteSpace: "pre-line" }}>{para}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    ))}
  </>
);

const MOUPage = ({ data, sectionNumber }: { data: ProposalData; sectionNumber: string }) => (
  <div className="proposal-page page-break bg-white max-w-[210mm] mx-auto shadow-lg print:shadow-none" style={{ padding: "25mm" }}>
    <div data-pdf-section>
      <SectionTitle number={sectionNumber} title="Memorandum of Understanding (MOU)" />
      <p className="text-xs text-muted-foreground mt-2 mb-6 italic">This Memorandum of Understanding sets forth the terms agreed upon by both parties.</p>

      <div className="space-y-1 text-sm leading-relaxed text-foreground/90">
        <p className="font-semibold">Parties:</p>
        <p><strong>Party A:</strong> {data.mouParties.partyA}, hereinafter referred to as "the Provider"</p>
        <p><strong>Party B:</strong> {data.mouParties.partyB}, hereinafter referred to as "the Client"</p>
      </div>
    </div>

    {data.mouClauses.map((clause) => (
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

    <div data-pdf-section className="mt-12">
      <p className="text-sm font-semibold mb-8">IN WITNESS WHEREOF, the parties have executed this Memorandum of Understanding as of the date set forth below.</p>
      <div className="grid grid-cols-2 gap-12">
        {data.mouSignatories.map((side, i) => (
          <div key={i} className="space-y-6">
            <p className="font-semibold text-sm">{side.party}</p>
            <p className="text-xs text-muted-foreground">{side.role}</p>
            <div className="space-y-4 mt-4">
              {["Signature", "Name", "Title", "Date"].map((field) => (
                <div key={field} className="border-b border-foreground/30 pb-1">
                  <p className="text-[10px] text-muted-foreground">{field}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ContactTeamPage = ({ showTeam, sectionNumber }: { showTeam: boolean; sectionNumber: string }) => (
  <div className="proposal-page page-break bg-white max-w-[210mm] mx-auto shadow-lg print:shadow-none" style={{ padding: "25mm" }}>
    <div data-pdf-section>
      <SectionTitle number={sectionNumber} title={showTeam ? "Contact & Team" : "Contact Information"} />
      {showTeam && (
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
      )}
    </div>

    <div data-pdf-section>
      <div className="mt-6 p-4 rounded-lg bg-muted/50 space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span>fadakmediahub@gmail.com</span>
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
        <p>© 2026 FADAK MEDIA HUB NIGERIA LIMITED. All rights reserved.</p>
      </div>
    </div>
  </div>
);

export default Proposal;
