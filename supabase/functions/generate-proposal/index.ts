import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { text } = await req.json();
    if (!text || text.trim().length < 20) {
      return new Response(
        JSON.stringify({ error: "Please provide more text content to generate a proposal." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a proposal structuring assistant for FADAK MEDIA HUB NIGERIA LIMITED.
Given raw text (from a PDF or pasted content), extract and structure it into a professional proposal format.

You MUST call the "structure_proposal" function with ALL extracted data. CRITICAL RULES:

1. NEVER omit any content from the source material. Every section must be captured.
2. If the document has a formal address block (Date, recipient name/title, address, Attention line, subject line, letter body), capture it in "coverLetter".
3. Sections like "Justification of Project Costs", "Conclusion", "Call to Action", "Path Forward" — these are FREE-PROSE sections that MUST go into "appendixSections". Do NOT drop them.
4. The formal address block (Date: ..., The Executive Governor..., Government House..., Attention: ...) goes into "coverLetter". Parse each field carefully.
5. Feature/deliverable bullet points go into "featurePages". Prose justifications and conclusions go into "appendixSections".
6. Preserve all numbered/roman-numeral sub-sections in appendixSections.subSections.
7. Map the content intelligently:
   - Identify the client/recipient name, title, and location
   - Extract or compose an executive summary from the content
   - Identify problems/objectives being addressed
   - Group features/deliverables/services into logical featurePages
   - Extract any pricing/budget tables with their items and costs
   - Identify timeline/phases
   - Create appropriate MOU clauses based on the scope and pricing`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Structure this content into a proposal. DO NOT omit any section — every paragraph, justification, conclusion, and letter block must be captured:\n\n${text}` },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "structure_proposal",
                description: "Return a fully structured proposal from the extracted content. Include ALL content — nothing may be omitted.",
                parameters: {
                  type: "object",
                  properties: {
                    proposalTitle: { type: "string", description: "Multi-line proposal title (use \\n for line breaks)" },
                    clientName: { type: "string" },
                    clientTitle: { type: "string", description: "e.g. 'Prepared For:'" },
                    clientLocation: { type: "string" },
                    date: { type: "string" },
                    demoUrl: { type: "string", description: "Optional demo URL" },
                    coverLetter: {
                      type: "object",
                      description: "Optional formal letter address block that appears before the proposal title. Extract this if the document starts with a formal address (Date, recipient name, Government House, Attention line, subject, letter body).",
                      properties: {
                        date: { type: "string", description: "e.g. '2026' or 'February 2026'" },
                        recipient: { type: "string", description: "Full recipient name and title, e.g. 'The Executive Governor of Gombe State,\\nHis Excellency, Muhammadu Inuwa Yahaya (CON),'" },
                        address: { type: "string", description: "e.g. 'Government House, Gombe, Gombe State.'" },
                        attention: { type: "string", description: "e.g. 'The Honorable Commissioner for Information and Culture Sir,'" },
                        salutation: { type: "string", description: "e.g. 'Sir,'" },
                        subject: { type: "string", description: "The letter subject/title line in UPPERCASE" },
                        body: { type: "string", description: "Full letter body text. Use \\n\\n for paragraph breaks. Include opening, objectives, deliverables, and closing/signature." },
                      },
                      required: ["recipient"],
                    },
                    executiveSummary: { type: "array", items: { type: "string" }, description: "Array of paragraphs for the executive summary" },
                    problems: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: { title: { type: "string" }, desc: { type: "string" } },
                        required: ["title", "desc"],
                      },
                    },
                    featurePages: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          sectionTitle: { type: "string" },
                          subtitle: { type: "string" },
                          description: { type: "string" },
                          features: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                title: { type: "string" },
                                items: { type: "array", items: { type: "string" } },
                              },
                              required: ["title", "items"],
                            },
                          },
                          retainerBox: {
                            type: "object",
                            properties: {
                              label: { type: "string" },
                              amount: { type: "string" },
                              note: { type: "string" },
                            },
                          },
                        },
                        required: ["sectionTitle", "features"],
                      },
                    },
                    pricingTables: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          label: { type: "string" },
                          headers: { type: "array", items: { type: "string" } },
                          rows: { type: "array", items: { type: "array", items: { type: "string" } } },
                          subtotal: { type: "array", items: { type: "string" } },
                        },
                        required: ["label", "headers", "rows"],
                      },
                    },
                    grandTotal: {
                      type: "object",
                      properties: {
                        label: { type: "string" },
                        amount: { type: "string" },
                        note: { type: "string" },
                      },
                      required: ["label", "amount", "note"],
                    },
                    timeline: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: { phase: { type: "string" }, task: { type: "string" } },
                        required: ["phase", "task"],
                      },
                    },
                    appendixSections: {
                      type: "array",
                      description: "REQUIRED for free-prose content that does not fit bullet lists: Justification of Costs, Conclusion, Call to Action, Path Forward, etc. NEVER drop this content.",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string", description: "Section heading, e.g. 'Justification of Project Costs'" },
                          body: { type: "string", description: "Opening paragraph(s) for this section. Use \\n\\n for paragraph breaks." },
                          subSections: {
                            type: "array",
                            description: "Numbered/roman-numeral sub-sections within this appendix section",
                            items: {
                              type: "object",
                              properties: {
                                heading: { type: "string", description: "e.g. 'I. Protection of Political Legacy' or '1. Global Marketing Tool'" },
                                content: { type: "string", description: "Full text of this sub-section. Use \\n\\n for paragraph breaks." },
                              },
                              required: ["heading", "content"],
                            },
                          },
                        },
                        required: ["title", "body"],
                      },
                    },
                    mouParties: {
                      type: "object",
                      properties: { partyA: { type: "string" }, partyB: { type: "string" } },
                      required: ["partyA", "partyB"],
                    },
                    mouClauses: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          num: { type: "number" },
                          title: { type: "string" },
                          content: { type: "string" },
                        },
                        required: ["num", "title", "content"],
                      },
                    },
                    mouSignatories: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: { party: { type: "string" }, role: { type: "string" } },
                        required: ["party", "role"],
                      },
                    },
                  },
                  required: [
                    "proposalTitle", "clientName", "clientTitle", "clientLocation", "date",
                    "executiveSummary", "problems", "featurePages", "pricingTables",
                    "grandTotal", "timeline", "mouParties", "mouClauses", "mouSignatories",
                  ],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "structure_proposal" } },
          max_tokens: 16000,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured proposal data");

    const proposalData = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(proposalData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-proposal error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
