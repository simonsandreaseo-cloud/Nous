import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { DOMParser } from "https://esm.sh/linkedom@0.16.8";
import { Readability } from "https://esm.sh/@mozilla/readability@0.5.0";
import TurndownService from "https://esm.sh/turndown@7.1.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Distills HTML to pure Markdown using Readability and Turndown
 */
const distillHtml = (html: string): { markdown: string; title: string } | null => {
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) return null;

    const reader = new Readability(doc);
    const article = reader.parse();

    if (!article || !article.content) return null;

    const turndownService = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
    });

    return {
      markdown: turndownService.turndown(article.content),
      title: article.title || "",
    };
  } catch (error) {
    console.error("[PurityScraper] Distillation error:", error);
    return null;
  }
};

/**
 * Fetches HTML using Cloudflare Browser Rendering (simulated for now, falls back to standard fetch)
 * TODO: Integrate with actual Cloudflare Browser Rendering API
 */
const fetchWithBrowserRendering = async (url: string): Promise<string> => {
  // In a real scenario, this would call Cloudflare's Browser Rendering worker
  // For the time being, we use a standard fetch to fulfill the pipeline
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Fetch failed with status: ${response.status}`);
  }

  return await response.text();
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { urls } = await req.json();

    if (!urls || !Array.isArray(urls)) {
      return new Response(JSON.stringify({ error: "An array of 'urls' is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (urls.length > 20) {
      return new Response(JSON.stringify({ error: "Maximum 20 URLs allowed per batch" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[PurityScraper] Processing ${urls.length} URLs in parallel...`);

    // Process URLs in parallel using Promise.allSettled (Task 1.2 strategy)
    const results = await Promise.allSettled(
      urls.map(async (url) => {
        console.log(`[PurityScraper] Fetching ${url}`);
        const html = await fetchWithBrowserRendering(url);
        
        console.log(`[PurityScraper] Distilling ${url}`);
        const distilled = distillHtml(html);
        
        if (!distilled) {
          throw new Error("Failed to distill HTML into Markdown");
        }

        return {
          url,
          title: distilled.title,
          markdown: distilled.markdown,
        };
      })
    );

    const processedResults = results.map((result, index) => {
      if (result.status === "fulfilled") {
        return {
          url: urls[index],
          success: true,
          data: result.value,
        };
      } else {
        return {
          url: urls[index],
          success: false,
          error: result.reason.message || "Unknown error occurred",
        };
      }
    });

    return new Response(JSON.stringify({ success: true, results: processedResults }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
