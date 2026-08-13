# Παύση — ιστοσελίδα

Στατικό, mobile-first site για την **Παύση**, εταιρεία τοποθέτησης και εκμετάλλευσης
αυτόματων πωλητών (vending machines) στα βόρεια προάστια Αθηνών.

Καθαρό HTML / CSS / vanilla JS, χωρίς framework και χωρίς build step. Η φόρμα
επικοινωνίας εξυπηρετείται από **Cloudflare Pages Function** που στέλνει email μέσω
**Resend**. Το site τρέχει στο **Cloudflare Pages** και στο domain `pafsi.gr`.

## Δομή

```
index.html            # Η σελίδα (single page με anchors)
styles.css            # Design tokens & στυλ
script.js             # Navigation, reveal on scroll, φόρμα
functions/api/contact.js   # Pages Function: POST /api/contact
assets/logo/          # Τα SVG του λογοτύπου
assets/og-image.png   # 1200×630 για Open Graph
favicon.*             # favicon.svg + PNG (32/180/192/512)
site.webmanifest
robots.txt, sitemap.xml
_headers, _redirects  # Cloudflare Pages config
.dev.vars.example     # Ονόματα μεταβλητών περιβάλλοντος
```

## Τοπική ανάπτυξη

Το site είναι καθαρά στατικό. Για μια γρήγορη προεπισκόπηση (χωρίς τη φόρμα) αρκεί
οποιοσδήποτε static server:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

Για να δουλέψει και η **φόρμα / Pages Function** τοπικά, χρησιμοποιήστε το Wrangler:

```bash
# 1. Αντιγράψτε τις μεταβλητές και συμπληρώστε τιμές
cp .dev.vars.example .dev.vars    # και βάλτε RESEND_API_KEY, CONTACT_EMAIL

# 2. Τρέξτε τοπικά με KV binding για το rate limiting
npx wrangler pages dev . --kv RATE_LIMIT
# → http://localhost:8788
```

Το `.dev.vars` περιέχει secrets και **δεν** ανεβαίνει στο git.

## Deploy (Cloudflare Pages)

Το repo συνδέεται απευθείας με **Cloudflare Pages**. Κάθε push στο `main` κάνει
αυτόματο deploy.

Ρυθμίσεις project στο Pages:

- **Framework preset:** None
- **Build command:** _(κενό)_
- **Build output directory:** `/` (η ρίζα σερβίρεται ως έχει)

### Μεταβλητές & bindings

Στο Pages → Settings:

| Τύπος | Όνομα | Περιγραφή |
|---|---|---|
| Secret (env var) | `RESEND_API_KEY` | API key του Resend |
| Env var | `CONTACT_EMAIL` | Παραλήπτης των αιτημάτων της φόρμας |
| Env var (προαιρ.) | `FROM_EMAIL` | Αποστολέας, π.χ. `Παύση <noreply@pafsi.gr>` (verified domain στο Resend) |
| KV namespace | `RATE_LIMIT` | Binding για rate limiting (π.χ. 5 υποβολές/ώρα ανά IP) |

Για το KV: **Workers & Pages → KV** → δημιουργήστε namespace → στο Pages project
προσθέστε **KV namespace binding** με Variable name `RATE_LIMIT`.

Στο Resend: επιβεβαιώστε το domain `pafsi.gr` ώστε να επιτρέπεται η αποστολή από το
`FROM_EMAIL`.

## Σύνδεση custom domain (`pafsi.gr`)

1. Στο Pages project → **Custom domains → Set up a custom domain**.
2. Προσθέστε `pafsi.gr` (apex) και ακολουθήστε τις οδηγίες DNS.
   - Αν το DNS του domain είναι ήδη στο Cloudflare, η εγγραφή δημιουργείται αυτόματα.
   - Αλλιώς, δείξτε το apex με `CNAME`/`A` στο Pages, όπως υποδεικνύει το dashboard.
3. Προσθέστε και το `www.pafsi.gr` ως custom domain. Το αρχείο `_redirects` ήδη
   ανακατευθύνει `www` → apex με 301.
4. Το SSL εκδίδεται αυτόματα από το Cloudflare.

## Σημειώσεις

- Χρώματα, τυπογραφία και το «ταμπελάκι τιμής» ορίζονται ως CSS custom properties στο
  `:root` του `styles.css`.
- Νέες σελίδες περιοχών (π.χ. `/aftomatoi-polites-kifisia`) μπορούν να προστεθούν
  αργότερα χωρίς αναδιοργάνωση της δομής.
```
