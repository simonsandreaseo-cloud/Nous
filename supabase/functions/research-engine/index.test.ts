import { assertEquals, assertNotEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { scrapeAndCleanUrl, processUrls } from "./index.ts";

// Minimal tests for Deno Edge Function
Deno.test("scrapeAndCleanUrl - handles invalid URL gracefully", async () => {
    const result = await scrapeAndCleanUrl("https://this-is-a-fake-url-that-does-not-exist.com");
    assertEquals(result, null);
});

Deno.test("processUrls - handles empty array", async () => {
    const result = await processUrls([]);
    assertEquals(result.length, 0);
});

// Note: A full test would mock globalThis.fetch to avoid network calls,
// but these basic sanity checks ensure the functions are exported and run without immediate syntax errors.
