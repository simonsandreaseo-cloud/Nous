import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const VALID_STATUSES = new Set([
  "por_revisar",
  "en_revision",
  "aprobado",
  "cambios_solicitados",
  "publicado",
]);

function getClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export async function GET(req: NextRequest) {
  try {
    const month = req.nextUrl.searchParams.get("month") || "mayo-2026";
    const supabase = getClient();
    const { data, error } = await supabase
      .from("deliverable_reviews")
      .select("item_key, status, client_note, updated_at")
      .eq("month_slug", month);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ items: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const itemKey = String(body?.item_key || "").trim();
    const monthSlug = String(body?.month_slug || "mayo-2026").trim();
    const status = String(body?.status || "").trim();
    const clientNote = body?.client_note !== undefined ? String(body.client_note) : null;

    if (!itemKey || !VALID_STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid item_key or status" }, { status: 400 });
    }

    const supabase = getClient();
    const { data, error } = await supabase.rpc("upsert_deliverable_review", {
      p_item_key: itemKey,
      p_month_slug: monthSlug,
      p_status: status,
      p_client_note: clientNote,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ item: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
