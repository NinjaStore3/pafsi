/**
 * Κοινή λογική της φόρμας επικοινωνίας.
 *
 * Χρησιμοποιείται και από το Worker (src/worker.js) και από το Pages
 * Function wrapper (functions/api/contact.js), ώστε να υπάρχει μία μόνο
 * πηγή αλήθειας.
 *
 * Environment variables / bindings:
 *   RESEND_API_KEY  — secret, το API key του Resend
 *   CONTACT_EMAIL   — ο παραλήπτης των αιτημάτων
 *   FROM_EMAIL      — (προαιρετικό) αποστολέας, π.χ. "Παύση <noreply@pafsi.gr>"
 *   RATE_LIMIT      — (προαιρετικό) KV namespace binding για rate limiting
 */

const LIMITS = {
  name: 100,
  phone: 30,
  email: 120,
  space: 60,
  area: 80,
  message: 1000,
};

const RATE_MAX = 5;              // υποβολές
const RATE_WINDOW_MS = 3600_000; // ανά ώρα

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isValidPhone(v) {
  const digits = (v.match(/\d/g) || []).length;
  return digits >= 8 && /^[0-9+()\s.\-]+$/.test(v);
}

async function readBody(request) {
  const ctype = request.headers.get("Content-Type") || "";
  if (ctype.includes("application/json")) {
    return await request.json();
  }
  // Fallback: form-encoded ή multipart
  const fd = await request.formData();
  const obj = {};
  for (const [k, v] of fd.entries()) obj[k] = typeof v === "string" ? v : "";
  return obj;
}

async function checkRateLimit(env, ip) {
  if (!env.RATE_LIMIT || !ip) return { ok: true };
  const key = "rl:" + ip;
  const now = Date.now();
  let rec = null;
  try {
    const raw = await env.RATE_LIMIT.get(key);
    if (raw) rec = JSON.parse(raw);
  } catch (_) { rec = null; }

  if (!rec || typeof rec.reset !== "number" || now > rec.reset) {
    rec = { count: 0, reset: now + RATE_WINDOW_MS };
  }
  if (rec.count >= RATE_MAX) return { ok: false };

  rec.count += 1;
  const ttl = Math.max(60, Math.ceil((rec.reset - now) / 1000));
  try {
    await env.RATE_LIMIT.put(key, JSON.stringify(rec), { expirationTtl: ttl });
  } catch (_) { /* μη κρίσιμο */ }
  return { ok: true };
}

/**
 * Επεξεργάζεται ένα POST της φόρμας και επιστρέφει Response με JSON.
 * @param {Request} request
 * @param {Record<string, any>} env
 * @returns {Promise<Response>}
 */
export async function handleContact(request, env) {
  // --- Ανάγνωση σώματος ---
  let data;
  try {
    data = await readBody(request);
  } catch (_) {
    return json({ ok: false, error: "Μη έγκυρα δεδομένα." }, 400);
  }
  if (!data || typeof data !== "object") {
    return json({ ok: false, error: "Μη έγκυρα δεδομένα." }, 400);
  }

  const get = (k) => (typeof data[k] === "string" ? data[k].trim() : "");
  const name = get("name");
  const phone = get("phone");
  const email = get("email");
  const space = get("space");
  const area = get("area");
  const message = get("message");
  const company = get("company"); // honeypot

  // --- Honeypot: σιωπηλή αποδοχή χωρίς αποστολή ---
  if (company) return json({ ok: true });

  // --- Επικύρωση ---
  if (name.length < 2 || name.length > LIMITS.name) {
    return json({ ok: false, error: "Συμπληρώστε το ονοματεπώνυμό σας." }, 400);
  }
  if (!isValidPhone(phone) || phone.length > LIMITS.phone) {
    return json({ ok: false, error: "Συμπληρώστε ένα έγκυρο τηλέφωνο." }, 400);
  }
  if (email && (!isValidEmail(email) || email.length > LIMITS.email)) {
    return json({ ok: false, error: "Η διεύθυνση email δεν είναι έγκυρη." }, 400);
  }
  if (space.length > LIMITS.space || area.length > LIMITS.area || message.length > LIMITS.message) {
    return json({ ok: false, error: "Κάποιο πεδίο ξεπερνά το μέγιστο μήκος." }, 400);
  }

  // --- Rate limiting ---
  const ip = request.headers.get("CF-Connecting-IP") || "";
  const rl = await checkRateLimit(env, ip);
  if (!rl.ok) {
    return json({ ok: false, error: "Έχουν σταλεί πολλά αιτήματα. Δοκιμάστε αργότερα." }, 429);
  }

  // --- Ρυθμίσεις email ---
  if (!env.RESEND_API_KEY || !env.CONTACT_EMAIL) {
    return json({ ok: false, error: "Η υπηρεσία αποστολής δεν είναι διαθέσιμη αυτή τη στιγμή." }, 500);
  }
  const from = env.FROM_EMAIL || "Παύση <noreply@pafsi.gr>";

  const lines = [
    ["Ονοματεπώνυμο", name],
    ["Τηλέφωνο", phone],
    ["Email", email || "—"],
    ["Είδος χώρου", space || "—"],
    ["Περιοχή", area || "—"],
    ["Μήνυμα", message || "—"],
    ["IP", ip || "—"],
  ];

  const text = lines.map(([k, v]) => k + ": " + v).join("\n");
  const html =
    '<h2 style="font-family:sans-serif">Νέο αίτημα από το pafsi.gr</h2>' +
    '<table style="font-family:sans-serif;border-collapse:collapse">' +
    lines
      .map(
        ([k, v]) =>
          '<tr><td style="padding:6px 12px;color:#5A6B7B;vertical-align:top"><strong>' +
          escapeHtml(k) +
          '</strong></td><td style="padding:6px 12px;white-space:pre-wrap">' +
          escapeHtml(v) +
          "</td></tr>"
      )
      .join("") +
    "</table>";

  const payload = {
    from,
    to: [env.CONTACT_EMAIL],
    subject: "Νέο αίτημα — " + name + (area ? " (" + area + ")" : ""),
    text,
    html,
  };
  if (email) payload.reply_to = email;

  // --- Αποστολή μέσω Resend ---
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + env.RESEND_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return json({ ok: false, error: "Δεν ήταν δυνατή η αποστολή του αιτήματος." }, 502);
    }
  } catch (_) {
    return json({ ok: false, error: "Δεν ήταν δυνατή η αποστολή του αιτήματος." }, 502);
  }

  return json({ ok: true });
}
