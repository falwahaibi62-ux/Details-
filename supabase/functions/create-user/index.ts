// Wathek - create-user (Admin only)
// Adds a user in one step: login account (with the password the Admin typed) + system role.
// - The caller must be a signed-in Admin (checked with public.current_app_role()).
// - The new user sees a one-time confidentiality reminder at the first sign-in (reminder_required).
// - No e-mail is sent from here; the Admin shares the welcome message himself (the app builds it).
// - The password is never logged and never returned. If the e-mail already has a login account, only the
//   system role is added and its password is left unchanged.
// - The service-role key is a Supabase secret; it never reaches the browser.
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = ["https://falwahaibi62-ux.github.io"];
const ROLES = ["Admin", "Member", "Viewer"];

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

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

  try {
    // 1) Caller must be an Admin
    const auth = req.headers.get("Authorization") ?? "";
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: role, error: roleErr } = await supa.rpc("current_app_role");
    if (roleErr || String(role) !== "Admin") return json({ error: "Only the Admin can add users." }, 403, origin);

    // 2) Input
    const body = await req.json().catch(() => null);
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const userRole = String(body?.role ?? "");
    const password = String(body?.password ?? "");
    if (!name || name.length > 80) return json({ error: "Enter the user's name (up to 80 characters)." }, 400, origin);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) return json({ error: "Enter a valid email address." }, 400, origin);
    if (!ROLES.includes(userRole)) return json({ error: "Choose a valid role." }, 400, origin);
    if (password.length < 8 || password.length > 72) return json({ error: "The password must be 8 to 72 characters." }, 400, origin);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 3) Already in the system?
    const { data: existing, error: exErr } = await admin.from("user_role").select("id").ilike("email", email.replace(/[\\%_]/g, (m) => "\\" + m)).limit(1);
    if (exErr) return json({ error: "Could not check the users list." }, 500, origin);
    if (existing && existing.length) return json({ error: "This email is already in the users list." }, 409, origin);

    // 4) Login account (confirmed, password chosen by the Admin)
    let created = false, createdId: string | null = null;
    const cr = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
    if (cr.error) {
      const msg = String(cr.error.message || "").toLowerCase();
      if (/already|registered|exists/.test(msg)) {
        // the person already has a login account: keep its password, only give the system role
      } else if (/password/.test(msg)) {
        return json({ error: "Could not set the password: " + cr.error.message }, 400, origin);
      } else {
        return json({ error: "Could not create the account: " + cr.error.message }, 502, origin);
      }
    } else {
      created = true;
      createdId = cr.data?.user?.id ?? null;
    }

    // 5) System role (same table the Users & Roles page reads)
    const { error: insErr } = await admin.from("user_role").insert([{ name, email, role: userRole, status: "enable", reminder_required: true }]);
    if (insErr) {
      if (createdId) await admin.auth.admin.deleteUser(createdId); // undo, nothing half-created
      return json({ error: "Could not save the user: " + insErr.message }, 500, origin);
    }

    // 6) History Log: record that this Admin added the user (best effort, never blocks the answer)
    try { await supa.rpc("log_event", { p_area: "Users", p_action: "created", p_label: email, p_summary: "Added user (" + userRole + ")" }); } catch (_e) { /* ignore */ }

    return json({ ok: true, created }, 200, origin);
  } catch (_e) {
    return json({ error: "Could not add the user. Please try again." }, 500, origin);
  }
});
