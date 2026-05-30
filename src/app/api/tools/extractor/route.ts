import * as cheerio from 'cheerio';
import { NextResponse } from 'next/server';

const evaluateClause = (clause: any, url: string, html: string): boolean => {
    const target = clause.field === "url" ? url : html;
    const pattern = clause.value;

    try {
        switch (clause.operator) {
            case "matches":
                return target === pattern;
            case "contains":
                return target.includes(pattern);
            case "not_contains":
                return !target.includes(pattern);
            case "regex": {
                let regexSource = pattern;
                if (!pattern.startsWith("/") && pattern.includes("*")) {
                    regexSource = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
                    regexSource = `^${regexSource}$`;
                }
                const regex = new RegExp(regexSource, "i");
                return regex.test(target);
            }
            default:
                return false;
        }
    } catch (e) {
        console.error("Clause evaluation error:", e);
        return false;
    }
};

const evaluateRuleConditions = (rule: any, url: string, html: string): boolean => {
    if (!rule.clauses || rule.clauses.length === 0) return true;

    const results = rule.clauses.map((c: any) => evaluateClause(c, url, html));
    
    if (rule.logic_operator === "OR") {
        return results.some((r: boolean) => r === true);
    }
    return results.every((r: boolean) => r === true);
};

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { url, rules } = body;

        if (!url) {
            return NextResponse.json({ success: false, error: "URL is required" }, { status: 400 });
        }

        // Googlebot Spoofing Strategy
        const userAgents = [
            "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
            "Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
            "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
        ];
        const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

        console.log(`[NextExtractor] Fetching ${url} using Googlebot Spoofing...`);

        const response = await fetch(url, {
            headers: {
                "User-Agent": userAgent,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3",
                "Cache-Control": "no-cache",
                "Pragma": "no-cache"
            },
        });

        if (!response.ok) {
            console.warn(`[NextExtractor] Fetch failed for ${url} with status: ${response.status}`);
            return NextResponse.json({ 
                success: false, 
                error: `Acceso denegado por el sitio (${response.status} ${response.statusText})`
            });
        }

        const html = await response.text();
        const results = [];

        const needsCheerio = rules.some((r: any) => r.extraction_type === "selector");
        const $ = needsCheerio ? cheerio.load(html) : null;

        for (const rule of rules) {
            let value = null;

            // 1. Logic Evaluation
            const isMatch = evaluateRuleConditions(rule, url, html);
            if (!isMatch) continue;

            // 2. Extraction
            if (rule.extraction_type === "regex") {
                try {
                    const regex = new RegExp(rule.extraction_value, "i");
                    const match = html.match(regex);
                    if (match) {
                        value = match[1] || match[0];
                    }
                } catch (e) {
                    console.error("Extraction regex error:", e);
                }
            } else if (rule.extraction_type === "selector" && $) {
                try {
                    const element = $(rule.extraction_value).first();
                    if (element.length > 0) {
                        value = element.text().trim();
                    }
                } catch (e) {
                    console.error("Selector error:", e);
                }
            }

            if (value !== null) {
                const formatted = (rule.output_template || "{value}").replace("{value}", value);
                results.push({
                    rule_id: rule.id,
                    value,
                    formatted,
                    success: true
                });
            } else {
                results.push({
                    rule_id: rule.id,
                    error: "No se encontró el patrón esperado en la página",
                    success: false
                });
            }
        }

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        console.error("[NextExtractor] Global error:", error);
        return NextResponse.json({ success: false, error: error.message });
    }
}
