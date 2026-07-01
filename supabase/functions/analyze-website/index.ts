import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { consumeRateLimit } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SSRF guard: only allow fetching public http(s) URLs. Blocks internal hosts,
// loopback, link-local and private ranges so this endpoint can't reach the cloud
// metadata service or internal network. Closes the common bypasses: integer/hex
// IP encodings, DNS-rebinding (resolves the host and checks the REAL IPs), and
// redirects (each hop is re-validated by safeFetch below).
function ipIsBlocked(ipRaw: string): boolean {
  const ip = ipRaw.replace(/^\[|\]$/g, "").toLowerCase();
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 10 || a === 127 || a === 0 || a >= 224) return true;
    if (a === 169 && b === 254) return true;       // link-local / metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  // IPv6 loopback / ULA / link-local / IPv4-mapped
  return ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80") || ip.startsWith("::ffff:");
}

async function isSafePublicUrl(raw: string): Promise<boolean> {
  let u: URL;
  try { u = new URL(raw); } catch { return false; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) return false;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) return false;
  // Reject integer / hex / octal IP encodings (e.g. http://2130706433 = 127.0.0.1).
  if (/^\d+$/.test(host) || /^0x/i.test(host)) return false;
  // Literal IP -> check directly.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":")) return !ipIsBlocked(host);
  // Hostname -> if DNS resolution is available, reject when any resolved IP is
  // private (anti-rebinding). If resolveDns isn't available in this runtime, fall
  // back to the string checks above + redirect re-validation - do NOT hard-block
  // legitimate sites (that would break the branding scan entirely).
  if (typeof (Deno as { resolveDns?: unknown }).resolveDns === "function") {
    try {
      const ips: string[] = [];
      for (const t of ["A", "AAAA"] as const) {
        try { ips.push(...(await Deno.resolveDns(host, t))); } catch { /* no record of this type */ }
      }
      if (ips.length && ips.some((ip) => ipIsBlocked(ip))) return false;
    } catch { /* resolution unavailable -> rely on string checks + redirect validation */ }
  }
  return true;
}

// fetch that re-validates every redirect hop against the SSRF guard.
async function safeFetch(target: string, init?: RequestInit, maxRedirects = 3): Promise<Response> {
  let current = target;
  for (let i = 0; i <= maxRedirects; i++) {
    if (!(await isSafePublicUrl(current))) throw new Error("blocked or disallowed URL");
    const res = await fetch(current, { ...init, redirect: "manual" });
    const loc = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
    if (!loc) return res;
    current = new URL(loc, current).toString();
  }
  throw new Error("too many redirects");
}

// Default palettes baked into common frameworks (WordPress/Gutenberg + Bootstrap).
// These appear in the CSS of almost every site of that stack and are NOT the
// site's real brand colors - exclude them from frequency-based detection.
const DEFAULT_PALETTE_DENYLIST = new Set<string>([
  // WordPress / Gutenberg preset palette
  "#FF6900", "#FCB900", "#7BDCB5", "#00D084", "#8ED1FC", "#0693E3", "#ABB8C3",
  "#EB144C", "#F78DA7", "#9900EF", "#CF2E2E", "#9B51E0",
  // Bootstrap defaults
  "#D9534F", "#5CB85C", "#5BC0DE", "#F0AD4E", "#0275D8", "#69727D", "#CC3366",
  "#337AB7", "#286090",
]);

// Pull the site's ACTUAL chosen colors from meaningful CSS variables (Elementor
// global colors, generic --primary/--brand, etc.). Skips --wp--preset-* which
// are framework defaults, not real choices. Returns labeled colors in priority.
function extractDeclaredColors(text: string): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  const seen = new Set<string>();
  const re =
    /(--e-global-color-(?:primary|secondary|text|accent)|--color-primary|--color-secondary|--primary|--secondary|--brand[\w-]*|--accent[\w-]*)\s*:\s*(#[0-9a-fA-F]{3,6}|rgba?\([^)]+\))/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const label = m[1].toLowerCase();
    let value = m[2].trim();
    const rgb = value.match(/rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)/i);
    if (rgb) {
      value =
        "#" + [rgb[1], rgb[2], rgb[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("");
    }
    value = value.toUpperCase();
    if (value.length === 4) value = "#" + value[1] + value[1] + value[2] + value[2] + value[3] + value[3];
    const key = label + value;
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ label, value });
    }
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require an authenticated user - this endpoint fetches arbitrary URLs
    // server-side and burns OpenAI tokens.
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const authHeader = req.headers.get("Authorization");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cost-abuse guard (fetch + LLM): cap analyses per user.
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (SERVICE_ROLE_KEY) {
      const rl = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
      if (!(await consumeRateLimit(rl, `analyzeweb:${user.id}`, 30, 3600))) {
        return new Response(
          JSON.stringify({ success: false, error: "rate_limited", message: "יותר מדי בקשות ניתוח. נסו שוב בעוד שעה." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!(await isSafePublicUrl(url))) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or disallowed URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    console.log("Analyzing website:", url);

    // Helper function to convert RGB to HEX
    const rgbToHex = (r: number, g: number, b: number): string => {
      const toHex = (n: number) => {
        const hex = Math.round(n).toString(16).padStart(2, '0');
        return hex.toUpperCase();
      };
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    };

    // Helper function to extract colors from CSS
    const extractColors = (html: string): string[] => {
      const colorFrequency = new Map<string, number>();
      
      const addColor = (color: string) => {
        const normalized = color.toUpperCase();
        colorFrequency.set(normalized, (colorFrequency.get(normalized) || 0) + 1);
      };
      
      // Extract HEX colors from inline styles and style tags
      const hexRegex = /#[0-9a-fA-F]{3,6}\b/g;
      const hexMatches = html.match(hexRegex);
      if (hexMatches) {
        hexMatches.forEach(hex => {
          // Normalize 3-digit to 6-digit
          if (hex.length === 4) {
            const normalized = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
            addColor(normalized);
          } else {
            addColor(hex);
          }
        });
      }
      
      // Extract RGB/RGBA colors
      const rgbRegex = /rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)/gi;
      let match;
      while ((match = rgbRegex.exec(html)) !== null) {
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        if (r <= 255 && g <= 255 && b <= 255) {
          addColor(rgbToHex(r, g, b));
        }
      }
      
      // Extract CSS variables (--primary-color, etc.)
      const cssVarRegex = /--[\w-]+\s*:\s*(#[0-9a-fA-F]{3,6}|rgba?\s*\([^)]+\))/gi;
      while ((match = cssVarRegex.exec(html)) !== null) {
        const colorValue = match[1];
        if (colorValue.startsWith('#')) {
          addColor(colorValue);
        } else if (colorValue.startsWith('rgb')) {
          const rgbMatch = colorValue.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
          if (rgbMatch) {
            const r = parseInt(rgbMatch[1]);
            const g = parseInt(rgbMatch[2]);
            const b = parseInt(rgbMatch[3]);
            addColor(rgbToHex(r, g, b));
          }
        }
      }
      
      // Filter out non-brand colors and sort by frequency
      const filtered = Array.from(colorFrequency.entries())
        .filter(([color]) => {
          const hex = color.slice(1);
          const r = parseInt(hex.slice(0, 2), 16);
          const g = parseInt(hex.slice(2, 4), 16);
          const b = parseInt(hex.slice(4, 6), 16);
          
          // Skip pure white, pure black, and very light/dark grays
          if ((r === 255 && g === 255 && b === 255) || // white
              (r === 0 && g === 0 && b === 0) || // black
              (r > 245 && g > 245 && b > 245) || // very light gray
              (r < 20 && g < 20 && b < 20)) { // very dark
            return false;
          }
          
          // Skip grays (colors where R, G, B are very similar)
          const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
          if (maxDiff < 15) {
            return false;
          }
          
          return true;
        })
        .sort((a, b) => b[1] - a[1]) // Sort by frequency (most used first)
        .map(([color]) => color);
      
      return filtered;
    };

    // First, fetch the website content
    let websiteContent = "";
    let websiteTitle = "";
    let extractedColors: string[] = [];
    try {
      const siteResponse = await safeFetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; SiangoBot/1.0)",
        },
      });
      const html = (await siteResponse.text()).slice(0, 2_000_000); // cap to avoid memory DoS

      // Also fetch external stylesheets - modern sites keep their brand colors
      // in linked CSS files, not inline in the HTML. Without this, detection
      // misses the real palette and returns stray inline colors. SSRF-guarded
      // and capped in count + total size.
      let cssText = "";
      try {
        const cssUrls: string[] = [];
        const linkRegex = /<link\b[^>]*>/gi;
        let lm: RegExpExecArray | null;
        while ((lm = linkRegex.exec(html)) !== null && cssUrls.length < 8) {
          const tag = lm[0];
          if (!/rel\s*=\s*["']?[^"'>]*stylesheet/i.test(tag)) continue;
          const href = tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
          if (!href) continue;
          try {
            cssUrls.push(new URL(href, url).toString()); // validated by safeFetch below
          } catch {
            // ignore malformed hrefs
          }
        }
        const sheets = await Promise.allSettled(
          cssUrls.map((u) =>
            safeFetch(u, { headers: { "User-Agent": "Mozilla/5.0 (compatible; SiangoBot/1.0)" } })
              .then((r) => (r.ok ? r.text() : "")),
          ),
        );
        for (const s of sheets) {
          if (s.status === "fulfilled") cssText += "\n" + s.value;
        }
        if (cssText.length > 800000) cssText = cssText.slice(0, 800000);
      } catch (cssErr) {
        console.error("stylesheet fetch failed:", cssErr);
      }

      // <meta name="theme-color"> is a strong brand-color signal - weight it
      // by repeating it so the frequency sort favours it.
      const themeColor = html.match(
        /<meta[^>]*name=["']theme-color["'][^>]*content=["'](#[0-9a-fA-F]{3,6})["']/i,
      )?.[1];

      // PRIORITY 1: the site's actual chosen palette, declared in CSS variables.
      const declaredColors = extractDeclaredColors(html + "\n" + cssText);

      // Fallback: frequency-based, but drop known framework default palettes so
      // we don't mistake WordPress/Bootstrap defaults for the brand color.
      extractedColors = extractColors(html + "\n" + cssText).filter(
        (c) => !DEFAULT_PALETTE_DENYLIST.has(c),
      );
      console.log("Declared colors:", declaredColors, "| theme-color:", themeColor, "| frequency:", extractedColors);
      
      // Extract title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      websiteTitle = titleMatch ? titleMatch[1].trim() : "";
      
      // Extract meta description
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
      const description = descMatch ? descMatch[1] : "";
      
      // Extract visible text (simplified)
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      const bodyHtml = bodyMatch ? bodyMatch[1] : html;
      const textContent = bodyHtml
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 3000);
      
      const declaredInfo =
        declaredColors.length > 0
          ? `\nDECLARED BRAND COLORS (the site's actual chosen palette - HIGHEST priority, use these): ${declaredColors
              .map((d) => `${d.label}=${d.value}`)
              .join(", ")}`
          : "";
      const themeInfo = themeColor ? `\nTheme color meta (strong brand signal): ${themeColor}` : "";
      const freqInfo =
        extractedColors.length > 0
          ? `\nOther colors found (LOW priority, fallback only - may include leftovers): ${extractedColors
              .slice(0, 10)
              .join(", ")}`
          : "";

      websiteContent = `
Title: ${websiteTitle}
Description: ${description}
Content Preview: ${textContent}${declaredInfo}${themeInfo}${freqInfo}
      `.trim();
    } catch (fetchError) {
      console.error("Failed to fetch website:", fetchError);
      websiteContent = `Website URL: ${url}`;
    }

    // Use AI to analyze and extract branding
    const systemPrompt = `You are an expert brand analyst. Analyze the provided website information and extract branding elements.

Return a JSON object with the following structure:
{
  "primaryColor": "#hexcode - the main brand color",
  "brandStyle": "modern" | "minimal" | "bold" | "elegant" - choose the best fit,
  "suggestedTagline": "A short tagline suggestion in Hebrew based on the business",
  "businessDescription": "Brief description of what the business does in Hebrew",
  "colorPalette": ["#hex1", "#hex2", "#hex3"] - 3 complementary colors
}

CRITICAL GUIDELINES FOR COLORS (follow this priority order strictly):
1. If "DECLARED BRAND COLORS" are provided, they ARE the real palette - use them. Map: the
   "primary" declared color → primaryColor; "secondary"/"accent"/"text" → colorPalette.
2. If no declared colors, use the "Theme color meta" as primaryColor.
3. Only if neither exists, fall back to "Other colors found".
- IGNORE generic framework default colors (e.g. bright #FF6900 orange, #CF2E2E red, #0693E3 blue
  from WordPress, or Bootstrap reds/greens) - these are NOT brand colors.
- A near-black/near-white may legitimately be the brand's base - don't discard it if it's declared.
- Treat colorPalette as: secondary color, then accent/touch colors.

Other Guidelines:
- brandStyle should match the tone: tech/startup = modern, luxury = elegant, creative = bold, simple products = minimal
- Keep tagline short and catchy in Hebrew
- Be creative but professional`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this website and extract branding:\n\n${websiteContent}` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_branding",
              description: "Extract branding elements from website analysis",
              parameters: {
                type: "object",
                properties: {
                  primaryColor: { 
                    type: "string", 
                    description: "Primary brand color in hex format (e.g., #7c3aed)" 
                  },
                  brandStyle: { 
                    type: "string", 
                    enum: ["modern", "minimal", "bold", "elegant"],
                    description: "The overall brand style" 
                  },
                  suggestedTagline: { 
                    type: "string", 
                    description: "A short catchy tagline in Hebrew" 
                  },
                  businessDescription: { 
                    type: "string", 
                    description: "Brief business description in Hebrew" 
                  },
                  colorPalette: { 
                    type: "array",
                    items: { type: "string" },
                    description: "3 complementary colors in hex format" 
                  }
                },
                required: ["primaryColor", "brandStyle", "suggestedTagline", "businessDescription", "colorPalette"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_branding" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded, please try again later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "Credits required, please add funds" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI analysis failed");
    }

    const aiData = await response.json();
    console.log("AI Response:", JSON.stringify(aiData));

    // Extract the tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("No branding data extracted");
    }

    const branding = JSON.parse(toolCall.function.arguments);
    
    console.log("Extracted branding:", branding);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          ...branding,
          websiteTitle,
          sourceUrl: url,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error analyzing website:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to analyze website" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
