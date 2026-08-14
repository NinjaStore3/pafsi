# Παύση — ιστοσελίδα

Στατικό, mobile-first site για την **Παύση**, εταιρεία τοποθέτησης και εκμετάλλευσης
αυτόματων πωλητών (vending machines) στα βόρεια προάστια Αθηνών.

Καθαρό HTML / CSS / vanilla JS, χωρίς framework και χωρίς build step. Η φόρμα
επικοινωνίας εξυπηρετείται από έναν **Cloudflare Worker** που στέλνει email μέσω
**Resend**. Το site τρέχει στο **Cloudflare (Workers + static assets)** και στο
domain `pafsi.gr`.

## Δομή

```
public/               # ό,τι σερβίρεται δημόσια (η ρίζα του site)
  index.html          # η σελίδα (single page με anchors)
  styles.css
  script.js
  assets/logo/        # τα SVG του λογοτύπου
  assets/og-image.png # 1200×630 για Open Graph
  favicon.*           # favicon.svg + PNG (32/180/192/512)
  site.webmanifest, robots.txt, sitemap.xml
  _headers

src/
  worker.js           # Worker entry: static assets + /api/contact
  contact.js          # η λογική της φόρμας (κοινή)

functions/api/contact.js   # wrapper για συμβατότητα με Cloudflare Pages
wrangler.jsonc        # ρυθμίσεις Worker (assets, vars, KV)
package.json          # wrangler (deploy/dev scripts)
.dev.vars.example     # ονόματα μεταβλητών περιβάλλοντος
```

> Η λογική της φόρμας ζει μία φορά στο `src/contact.js`. Το `src/worker.js` (Workers)
> και το `functions/api/contact.js` (Pages) την καλούν, ώστε το project να μπορεί να
> γίνει deploy και με τους δύο τρόπους.

## Τοπική ανάπτυξη

```bash
npm install

# 1. (προαιρετικό) μεταβλητές για τη φόρμα
cp .dev.vars.example .dev.vars    # βάλτε RESEND_API_KEY, CONTACT_EMAIL

# 2. τοπικός server με τον πραγματικό Workers runtime
npx wrangler dev
# → http://localhost:8787   (στατικά + /api/contact)
```

Το `.dev.vars` περιέχει secrets και **δεν** ανεβαίνει στο git.

## Deploy (Cloudflare Workers)

Το repo συνδέεται με το Cloudflare μέσω **Workers Builds**. Κάθε push στο `main`
κάνει αυτόματο deploy.

Στο dashboard, όταν συνδέσετε το GitHub repo (Workers & Pages → Create → Import a
repository → `NinjaStore3/pafsi`):

- **Build command:** *(κενό)*
- **Deploy command:** `npx wrangler deploy`
- Branch: `main`

Το `wrangler.jsonc` ορίζει τα πάντα: σερβίρει το `public/` ως στατικά αρχεία και
τρέχει τον Worker για το `POST /api/contact`.

### Μεταβλητές & bindings

Στο project → **Settings → Variables and Secrets**:

| Τύπος | Όνομα | Περιγραφή |
|---|---|---|
| **Secret** | `RESEND_API_KEY` | API key του Resend |
| Var *(ήδη στο wrangler.jsonc)* | `CONTACT_EMAIL` | Παραλήπτης των αιτημάτων (αλλάξτε το εκεί ή εδώ) |
| Var *(ήδη στο wrangler.jsonc)* | `FROM_EMAIL` | Αποστολέας, π.χ. `Παύση <noreply@pafsi.gr>` (verified domain στο Resend) |

> Το `RESEND_API_KEY` είναι **secret** — ορίστε το στο dashboard, ποτέ στον κώδικα.
> Χωρίς αυτό, η φόρμα επιστρέφει καθαρό μήνυμα σφάλματος (500) και το site δουλεύει
> κανονικά κατά τα άλλα.

### Rate limiting (προαιρετικό, KV)

1. **Workers & Pages → KV → Create namespace** (π.χ. `pafsi-rate-limit`).
2. Αντιγράψτε το **Namespace ID** και ξεσχολιάστε στο `wrangler.jsonc`:
   ```jsonc
   "kv_namespaces": [
     { "binding": "RATE_LIMIT", "id": "PASTE_KV_NAMESPACE_ID" }
   ]
   ```
3. Push → ο Worker αρχίζει να περιορίζει σε 5 υποβολές/ώρα ανά IP. Χωρίς το KV, το
   rate limiting απλώς παρακάμπτεται (δεν σπάει τίποτα).

## Resend

1. Λογαριασμός στο **resend.com**.
2. **Domains → Add Domain** → `pafsi.gr` → προσθέστε τα DNS records που δίνει
   (DKIM/SPF) στο Cloudflare DNS → **Verify**.
3. **API Keys → Create** → βάλτε το key ως `RESEND_API_KEY` (secret) στο project.

> Δοκιμή πριν την επιβεβαίωση του domain: βάλτε `FROM_EMAIL=onboarding@resend.dev`
> και `CONTACT_EMAIL` το δικό σας email (test mode του Resend).

## Custom domain (`pafsi.gr`)

1. Βάλτε το `pafsi.gr` στο Cloudflare (Add a site) και αλλάξτε nameservers στον
   registrar.
2. Project → **Settings → Domains & Routes → Add** → `pafsi.gr` (και `www.pafsi.gr`).
3. `www` → apex: το Workers static-assets `_redirects` δέχεται μόνο **σχετικά**
   URLs, οπότε ο cross-host redirect γίνεται με **Cloudflare Redirect Rule**:
   Rules → **Redirect Rules** → Create → *When* hostname equals `www.pafsi.gr`
   → *Then* Dynamic redirect to `concat("https://pafsi.gr", http.request.uri.path)`,
   status **301**, Preserve query string. (Προαιρετικό — μπορείτε απλώς να μη
   συνδέσετε καθόλου το `www`.)
4. Το SSL εκδίδεται αυτόματα.

## Σημειώσεις

- Χρώματα, τυπογραφία και το «ταμπελάκι τιμής» ορίζονται ως CSS custom properties στο
  `:root` του `public/styles.css`.
- Νέες σελίδες περιοχών (π.χ. `/aftomatoi-polites-kifisia`) μπορούν να προστεθούν
  αργότερα ως αρχεία μέσα στο `public/`, χωρίς αναδιοργάνωση.
```
