// Wathek - extract-job
// Reads ONE moving-company PDF and returns only the fields the system needs.
// - Requires a signed-in user whose role in public.user_role is Admin or Member.
// - The PDF is sent inline to the Claude Messages API (no Files API, no batches) and is never stored here.
// - Customer name / address / phone are never requested and are dropped if returned.
// - The Anthropic key is a Supabase secret (ANTHROPIC_API_KEY); it never reaches the browser.
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = ["https://falwahaibi62-ux.github.io"];
const MODEL = "claude-sonnet-5-5";
const MAX_BASE64_CHARS = 14 * 1024 * 1024; // about 10 MB of PDF
const COLORS = ["orange", "yellow", "green", "blue", "red", "pink", "purple", "white"];

function cors(origin: string | null) {
  const o = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": o,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json" } });
}

const field = (desc: string, type: string, extra: Record<string, unknown> = {}) => ({
  type: "object",
  description: desc,
  properties: {
    value: { type: [type, "null"], ...extra },
    page: { type: ["integer", "null"], description: "1-based PDF page where the value was read" },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
  },
  required: ["value", "page", "confidence"],
});

const TOOL = {
  name: "extract_job",
  description: "Return the job data read from the document. Use null when a value is missing or not legible. Never guess.",
  input_schema: {
    type: "object",
    properties: {
      order_no: field("Order number printed top-right (e.g. G4655711)", "string"),
      pickup_date: field("Actual pick up date as YYYY-MM-DD", "string"),
      origin_state: field("2-letter US state code of the ORIGIN address (state only)", "string"),
      destination_state: field("2-letter US state code of the DESTINATION address (state only)", "string"),
      foreman_name: field("Name of the foreman / driver crew leader (first name only is fine)", "string"),
      total_amount: field("Total estimated / applicable charges in dollars (final, not an earlier estimate)", "number"),
      prepaid_deposit: field("Prepaid deposit in dollars", "number"),
      balance_due_at_destination: field("Balance due at destination / balance due to carrier in dollars", "number"),
      lot_no: field("Lot number written on the tape sticker or in 'TAPE LOT NO.' (e.g. KU0695)", "string"),
      tape_color: field("Color of the tape stickers", "string", { enum: [...COLORS, null] }),
    },
    required: ["order_no", "pickup_date", "origin_state", "destination_state", "foreman_name", "total_amount", "prepaid_deposit", "balance_due_at_destination", "lot_no", "tape_color"],
  },
};

const PROMPT = `You are reading a scanned moving-company document set (inventory, bill of lading, estimate, delivery sheet).
Call the extract_job tool with ONLY the requested fields.
Rules:
- Never return, quote or mention the customer's name, street address, phone number or e-mail. They are not requested.
- Handwriting can be hard to read: if you are not sure of a value, use confidence "low"; if you cannot read it, use null. Never guess.
- Amounts are plain numbers in US dollars (no $ sign, no commas).
- Where a value appears on several pages with different numbers (for example an earlier estimate and a final one), use the final/signed one and say the page.
- tape_color: use one of ${COLORS.join(", ")}; null if unknown.`;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

  try {
    // 1) Who is calling? Must be Admin or Member.
    const auth = req.headers.get("Authorization") ?? "";
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: role, error: roleErr } = await supa.rpc("current_app_role");
    if (roleErr || !["Admin", "Member"].includes(String(role))) return json({ error: "Not allowed" }, 403, origin);

    // 2) Input
    const body = await req.json().catch(() => null);
    const b64 = body?.pdf_base64;
    if (typeof b64 !== "string" || b64.length < 100) return json({ error: "No PDF received" }, 400, origin);
    if (b64.length > MAX_BASE64_CHARS) return json({ error: "PDF is too large to read (max about 10 MB)" }, 413, origin);

    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return json({ error: "Reading is not configured yet (missing API key)" }, 503, origin);

    // 3) Ask Claude (PDF inline, forced tool output)
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        tools: [TOOL],
        tool_choice: { type: "tool", name: "extract_job" },
        messages: [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
            { type: "text", text: PROMPT },
          ],
        }],
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      console.error("Anthropic error", r.status, t.slice(0, 300));
      return json({ error: "The reading service returned an error. Try again later." }, 502, origin);
    }
    const out = await r.json();
    const tool = (out.content ?? []).find((c: any) => c.type === "tool_use");
    if (!tool) return json({ error: "No data could be read from this document" }, 422, origin);

    // 4) Keep only the allowed fields, validate
    const allowed = Object.keys(TOOL.input_schema.properties);
    const fields: Record<string, unknown> = {};
    for (const k of allowed) fields[k] = (tool.input as any)[k] ?? { value: null, page: null, confidence: "low" };

    const warnings: string[] = [];
    const v = (k: string) => (fields[k] as any)?.value;
    const num = (x: unknown) => (typeof x === "number" && isFinite(x) ? x : null);
    const total = num(v("total_amount")), dep = num(v("prepaid_deposit")), bal = num(v("balance_due_at_destination"));
    if (total !== null && dep !== null && bal !== null && Math.abs(total - dep - bal) > 0.5) {
      warnings.push(`Total (${total}) minus deposit (${dep}) is ${total - dep}, but the balance read is ${bal}. Check these three amounts.`);
    }
    const d = String(v("pickup_date") ?? "");
    if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) warnings.push("Pick up date was not read in a valid format.");
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const ms = Date.parse(d);
      if (isNaN(ms) || ms > Date.now() + 90 * 864e5 || ms < Date.now() - 5 * 365 * 864e5) warnings.push("Pick up date looks unusual. Check it.");
    }
    for (const st of ["origin_state", "destination_state"]) {
      const s = String(v(st) ?? "");
      if (s && !/^[A-Za-z]{2}$/.test(s)) warnings.push(`${st === "origin_state" ? "Origin" : "Destination"} state was not read as a 2-letter code.`);
    }
    const lot = String(v("lot_no") ?? "");
    if (lot && !/^[A-Za-z0-9-]{3,20}$/.test(lot)) warnings.push("Lot number has an unusual format. Check it.");

    return json({ fields, warnings, model: MODEL }, 200, origin);
  } catch (e) {
    console.error("extract-job failed", String(e).slice(0, 200));
    return json({ error: "Unexpected error" }, 500, origin);
  }
});
