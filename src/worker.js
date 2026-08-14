/**
 * Cloudflare Worker entry (static assets + API).
 *
 * Τα στατικά αρχεία σερβίρονται αυτόματα μέσω του ASSETS binding
 * (δείτε wrangler.jsonc). Ο Worker τρέχει μόνο για διαδρομές που δεν
 * αντιστοιχούν σε στατικό αρχείο — π.χ. το /api/contact.
 */
import { handleContact, json } from "./contact.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/contact") {
      if (request.method === "POST") return handleContact(request, env);
      return json({ ok: false, error: "Method Not Allowed" }, 405);
    }

    // Οτιδήποτε άλλο → στατικά αρχεία
    return env.ASSETS.fetch(request);
  },
};
