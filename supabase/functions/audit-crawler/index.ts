import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.36-alpha/deno-dom-wasm.ts";
import { Readability } from "https://esm.sh/@mozilla/readability@0.5.0";
import TurndownService from "https://esm.sh/turndown@7.1.2";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Normalizes a URL for comparison
 */
const normalizeUrl = (url: string): string => {
  if (!url) return "";
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/$/, "");
  } catch {
    return url.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
  }
};

/**
 * Distills HTML to pure Markdown using Readability and Turndown
 */
const distillHtml = (html: string): string | null => {
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

    return turndownService.turndown(article.content);
  } catch (error) {
    console.error("[AuditCrawler] Distillation error:", error);
    return null;
  }
};

serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { projectId, limit = 5 } = await req.json();

    if (!projectId) {
      return new Response(JSON.stringify({ error: "Project ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Fetch pending URLs from the queue
    const { data: queueItems, error: queueError } = await supabase
      .from("url_scraping_queue")
      .select("*, project_urls(id, url)")
      .eq("project_id", projectId)
      .eq("status", "pending")
      .limit(limit);

    if (queueError) throw queueError;
    if (!queueItems || queueItems.length === 0) {
      return new Response(JSON.stringify({ message: "No pending URLs in queue" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[AuditCrawler] Starting crawl for ${queueItems.length} URLs in project ${projectId}`);

    const results = [];

    for (const item of queueItems) {
      const urlId = item.url_id;
      const baseUrl = item.project_urls.url;
      const fullUrl = baseUrl.startsWith("http") ? baseUrl : `https://${Deno.env.get("PROJECT_DOMAIN") || ""}${baseUrl}`;

      try {
        console.log(`[AuditCrawler] Crawling: ${fullUrl}`);
        
        // Update status to processing
        await supabase.from("url_scraping_queue").update({ status: "processing" }).eq("id", item.id);

        const response = await fetch(fullUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
          },
        });

        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        if (!doc) throw new Error("Failed to parse HTML");

        // --- Extraction ---
        const title = doc.querySelector("title")?.textContent?.trim() || "";
        const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() || "";
        const h1 = doc.querySelector("h1")?.textContent?.trim() || "";
        const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute("href") || "";
        
        // Hreflangs (Critical for I18n Bridge)
        const hreflangs = Array.from(doc.querySelectorAll('link[rel="alternate"][hreflang]')).map(el => ({
            lang: el.getAttribute("hreflang"),
            href: el.getAttribute("href")
        }));

        // Schemas
        const schemas = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))
            .map(el => {
                try { return JSON.parse(el.textContent || "{}"); } catch { return null; }
            }).filter(s => s !== null);

        // Assets (Images)
        const images = Array.from(doc.querySelectorAll("img")).map(img => ({
            img_source: img.getAttribute("src") || "",
            alt_text: img.getAttribute("alt") || "",
            img_title: img.getAttribute("title") || ""
        })).filter(img => img.img_source !== "");

        // Links
        const links = Array.from(doc.querySelectorAll("a[href]")).map(a => {
            const href = a.getAttribute("href") || "";
            const isInternal = href.startsWith("/") || href.includes(Deno.env.get("PROJECT_DOMAIN") || "");
            return {
                target_url: href,
                anchor_text: a.textContent?.trim() || "",
                is_internal: isInternal
            };
        });

        const wordCount = html.replace(/<[^>]*>?/gm, " ").split(/\s+/).length;

        // --- Database Updates (Parallel) ---
        await Promise.all([
          // 1. Summary
          supabase.from("url_audit_summaries").upsert({
            url_id: urlId,
            project_id: projectId,
            title,
            meta_description: metaDesc,
            h1,
            canonical,
            word_count: wordCount,
            links_internal_count: links.filter(l => l.is_internal).length,
            links_external_count: links.filter(l => !l.is_internal).length,
            images_count: images.length,
            images_missing_alt_count: images.filter(img => !img.alt_text).length,
            status_code: response.status,
            last_audit_at: new Date().toISOString()
          }),

          // 2. Details
          supabase.from("url_audit_details").upsert({
            url_id: urlId,
            project_id: projectId,
            full_schema: { schemas },
            og_data: {
                og_title: doc.querySelector('meta[property="og:title"]')?.getAttribute("content"),
                og_image: doc.querySelector('meta[property="og:image"]')?.getAttribute("content")
            },
            distilled_markdown: distillHtml(html),
            updated_at: new Date().toISOString()
          }),


          // 3. Assets (Delete old & Insert new)
          supabase.from("url_assets").delete().eq("url_id", urlId).then(() => {
              if (images.length > 0) {
                return supabase.from("url_assets").insert(images.map(img => ({ ...img, url_id: urlId, project_id: projectId })));
              }
          }),

          // 4. Links
          supabase.from("url_links").delete().eq("source_url_id", urlId).then(() => {
              if (links.length > 0) {
                  return supabase.from("url_links").insert(links.map(l => ({ 
                      source_url_id: urlId, 
                      project_id: projectId,
                      target_url: l.target_url,
                      anchor_text: l.anchor_text,
                      is_internal: l.is_internal
                  })));
              }
          })
        ]);

        // --- SKU Extraction for Semantic Linking ---
        let sku: string | null = null;
        for (const s of schemas) {
            if (s["@type"] === "Product" || s["@type"]?.includes("Product")) {
                sku = s.sku || s.mpn || s.identifier || s.productID;
                if (sku) break;
            }
        }

        // --- I18n Bridge Logical Mapping ---
        let groupWasFound = false;

        // A. Linking by Hreflangs
        if (hreflangs.length > 0) {
            for (const h of hreflangs) {
                if (!h.href) continue;
                const normHreflangUrl = normalizeUrl(h.href);
                
                const { data: targetUrl } = await supabase
                    .from("project_urls")
                    .select("id, language_group_id")
                    .eq("project_id", projectId)
                    .ilike("url", `%${normHreflangUrl}%`)
                    .maybeSingle();

                if (targetUrl) {
                    console.log(`[AuditCrawler] Found I18n Match (Hreflang): ${baseUrl} <-> ${h.href}`);
                    let groupId = targetUrl.language_group_id;
                    if (!groupId) {
                        const { data: newGroup } = await supabase.from("url_language_groups").insert({ project_id: projectId }).select().single();
                        groupId = newGroup.id;
                    }
                    await supabase.from("project_urls").update({ language_group_id: groupId }).in("id", [urlId, targetUrl.id]);
                    groupWasFound = true;
                }
            }
        }

        // B. Linking by SKU (Semantic Match for translated slugs)
        if (!groupWasFound && sku) {
            console.log(`[AuditCrawler] Found SKU: ${sku}, searching for matches...`);
            // Find other audit details with the same SKU in this project
            const { data: matches } = await supabase
                .from("url_audit_details")
                .select("url_id, project_urls(language_group_id)")
                .eq("project_id", projectId)
                .neq("url_id", urlId)
                // Filter where full_schema contains the SKU. JSONB query.
                .contains("full_schema", { schemas: [{ sku: sku }] }) 
                .limit(5);

            if (matches && matches.length > 0) {
                const targetWithGroup = matches.find(m => m.project_urls?.language_group_id);
                let groupId = targetWithGroup?.project_urls?.language_group_id;

                if (!groupId) {
                    const { data: newGroup } = await supabase.from("url_language_groups").insert({ project_id: projectId }).select().single();
                    groupId = newGroup.id;
                }

                console.log(`[AuditCrawler] Found I18n Match (Semantic SKU): ${sku} links to Group ${groupId}`);
                await supabase.from("project_urls").update({ language_group_id: groupId }).in("id", [urlId, ...matches.map(m => m.url_id)]);
            }
        }

        await supabase.from("url_scraping_queue").update({ status: "completed" }).eq("id", item.id);
        results.push({ url: baseUrl, success: true });

      } catch (err) {
        console.error(`[AuditCrawler] Error crawling ${fullUrl}:`, err);
        await supabase.from("url_scraping_queue").update({ 
            status: "error", 
            last_error: err.message,
            attempts: item.attempts + 1
        }).eq("id", item.id);
        results.push({ url: baseUrl, success: false, error: err.message });
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
