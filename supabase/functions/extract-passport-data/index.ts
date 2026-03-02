import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        console.log("Authenticated user:", user.email);
      }
    }

    const { base64Image } = await req.json();
    if (!base64Image) {
      throw new Error("Missing base64Image in request body");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    // Fallback to GEMINI_API_KEY if lovable key isn't provided/available for this purpose, but lovable is preferred in this project
    const apiKey = LOVABLE_API_KEY || Deno.env.get("GEMINI_API_KEY");

    if (!apiKey) {
      throw new Error("API key not configured");
    }

    const systemPrompt = `You are a highly accurate passport data extraction AI.
Analyze the provided passport data page image and extract the requested fields.
Additionally, you must find the coordinates of the user's face (the portrait photo on the passport) returning a bounding box (crop_box) with x, y, width, and height in pixels or relative percentage (0-1). Provide coordinates relative to the original image dimensions [0, 1].

Return ONLY a pure JSON object (no markdown formatting, no backticks, no markdown code blocks).

Expected JSON format:
{
  "full_name": "JOHN DOE",
  "passport_number": "A1234567",
  "dob": "1990-01-01",
  "gender": "male",
  "nationality": "USA",
  "passport_expiry_date": "2030-01-01",
  "crop_box": {
    "x": 0.1,
    "y": 0.2,
    "width": 0.3,
    "height": 0.4
  }
}

If any field is unreadable, emit null for that field. Always return the face crop_box if found. For gender, use "male" or "female". For nationality use the country name or code. Dates must be YYYY-MM-DD.`;

    // We'll call the standard OpenAI-compatible completions endpoint if using lovable gateway, or direct Gemini
    const endpoint = LOVABLE_API_KEY
      ? "https://ai.gateway.lovable.dev/v1/chat/completions"
      : "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

    const fetchHeaders: any = {
      "Content-Type": "application/json",
    };

    if (LOVABLE_API_KEY) {
      fetchHeaders["Authorization"] = `Bearer ${LOVABLE_API_KEY}`;
    } else {
      fetchHeaders["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: fetchHeaders,
      body: JSON.stringify({
        model: "google/gemini-1.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract the data and face coordinates from this passport." },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
            ]
          }
        ],
        // temperature: 0,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API Error:", response.status, errorText);
      throw new Error(\`AI API Error: \${response.status}\`);
    }

    const result = await response.json();
    let jsonContent = result.choices[0].message.content;
    
    // Safety clean up in case the model ignored the instructions and gave markdown
    if (jsonContent.startsWith('\`\`\`json')) {
      jsonContent = jsonContent.replace(/^\`\`\`json\\n/, '').replace(/\\n\`\`\`$/, '');
    } else if (jsonContent.startsWith('\`\`\`')) {
      jsonContent = jsonContent.replace(/^\`\`\`\\n/, '').replace(/\\n\`\`\`$/, '');
    }

    const parsedData = JSON.parse(jsonContent);

    return new Response(JSON.stringify(parsedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Passport extraction error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
