/**
 * Cloudflare Pages Function — POST /api/contact
 *
 * Λεπτό wrapper γύρω από την κοινή λογική στο src/contact.js, ώστε το site
 * να μπορεί να γίνει deploy είτε ως Pages project είτε ως Worker με static
 * assets (δείτε wrangler.jsonc + src/worker.js), με μία πηγή αλήθειας.
 */
import { handleContact, json } from "../../src/contact.js";

export const onRequestPost = ({ request, env }) => handleContact(request, env);

// Οτιδήποτε εκτός POST → 405
const methodNotAllowed = () => json({ ok: false, error: "Method Not Allowed" }, 405);
export const onRequestGet = methodNotAllowed;
export const onRequestPut = methodNotAllowed;
export const onRequestDelete = methodNotAllowed;
