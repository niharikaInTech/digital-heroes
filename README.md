# Digital Heroes

A subscription platform that combines golf score tracking, a monthly prize draw and charity giving.
Built for the Digital Heroes PRD (Level 1, 2026 edition).

**Stack:** Next.js 14 (App Router) - Supabase (Postgres, Auth, Storage) - Stripe - Tailwind CSS - deployed on Vercel.
Plain JavaScript, no TypeScript.

---

## 1. Run it locally

```bash
npm install
cp .env.example .env.local      # then fill in the values (steps below)
npm run dev                     # http://localhost:3000
npm test                        # unit tests for the draw engine
```

### Supabase (use a NEW project, as the PRD asks)
1. Create a project at supabase.com.
2. **SQL Editor** > paste all of `supabase/schema.sql` > Run. This creates the tables, security rules, triggers, the storage bucket and 4 sample charities.
3. **Project Settings > API**: copy the URL, the `anon` key and the `service_role` key into `.env.local`.
4. **Authentication > Providers > Email**: turn **Confirm email OFF** for the demo, so signup logs the tester straight in.
5. Sign up in the app, then make yourself admin (SQL Editor):
   ```sql
   update profiles set role = 'admin' where email = 'you@example.com';
   ```

### Stripe (optional, only if USE_STRIPE=true)
1. Dashboard > **Product catalogue**: create a product "Monthly" (recurring, monthly, 999 INR) and "Yearly" (recurring, yearly, 9999 INR). Copy each **Price ID** (`price_...`) into `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_YEARLY`.
   (If your Stripe account can't charge in INR, change the currency there and the `inr()` helper in `lib/format.js`.)
2. Copy the secret key into `STRIPE_SECRET_KEY`.
3. Turn on the **Customer portal** (Settings > Billing > Customer portal) so "Manage or cancel plan" works.
4. Webhook, locally:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Copy the `whsec_...` it prints into `STRIPE_WEBHOOK_SECRET`.
5. Test card: `4242 4242 4242 4242`, any future date, any CVC.

### Payments (demo by default, Stripe optional)
Out of the box the app uses **demo payments**, so no Stripe account or extra variable is needed. Choosing a plan opens a demo
checkout page (`/subscribe/checkout`), and paying there activates the plan and shows a "Payment successful" page
(`/subscribe/success`). No card is asked for and no money moves. The dashboard's cancel button and the charity donation form
also work in demo mode.

The full Stripe integration (checkout, webhook, customer portal) is still in the code. To switch to it, set `USE_STRIPE=true`
and add the Stripe test keys and price IDs from the section above. Never run demo mode for real customers: anyone could
activate a plan for free.

### Admin access
There is no default admin. Sign up (or create a user in Supabase > Authentication), then run
`update profiles set role = 'admin' where email = 'you@example.com';`. Admins sign in on their own page, **`/admin/login`**,
and get a separate admin console (sidebar layout, no public navbar). The normal `/login` refuses admin accounts, and
`/admin/login` refuses everyone who isn't an admin. Admins can't use the subscriber dashboard.

### Deploy (PRD 15.1: new Vercel account, new Supabase project)
1. Push to GitHub, import the repo in the new Vercel account.
2. Add every variable from `.env.example` in Vercel > Settings > Environment Variables. Set `NEXT_PUBLIC_SITE_URL` to your live URL.
3. In Stripe, add a webhook endpoint `https://YOUR-SITE/api/stripe/webhook` for these events:
   `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`.
   Put its signing secret in `STRIPE_WEBHOOK_SECRET` and redeploy.
4. In Supabase > Authentication > URL configuration, set the Site URL to your live URL.

---

## 2. What is where (PRD section -> code)

| PRD section | Where |
|---|---|
| 03 User roles | `profiles.role`, `middleware.js`, `lib/auth.js` (`requireUser`, `requireAdmin`) |
| 04 Subscription and payment | `app/actions/billing.js`, `app/api/stripe/webhook/route.js`, `lib/auth.js` (`isActive`) |
| 05 Score management | `supabase/schema.sql` (unique per date, rolling-5 trigger), `app/dashboard/actions.js`, `components/dashboard/ScoreManager.js` |
| 06 Draw and reward | `lib/draw.mjs` (engine), `app/admin/draws/actions.js` (simulate then publish) |
| 07 Prize pool logic | `lib/draw.mjs` (`calculatePools`, `settleDraw`), `lib/config.js` |
| 08 Charity system | `app/charities/*`, `components/CharityPicker`, `app/actions/billing.js` (`donate`) |
| 09 Winner verification | `components/dashboard/ProofForm.js`, `app/admin/winners/page.js`, `app/admin/actions.js` |
| 10 User dashboard | `app/dashboard/page.js` |
| 11 Admin dashboard | `app/admin/(panel)/*` (pages), `app/admin/login` (admin login) |
| 12 UI / UX | `app/globals.css`, `tailwind.config.js`, `app/page.js`, `components/SplitDemo.js` |

## 3. How the important parts work (good for your viva)

**Subscription state is only changed by Stripe's webhook.** The browser never tells us "I paid". Checkout sends the user to Stripe, Stripe calls `/api/stripe/webhook` (signature verified), and that route updates `profiles.subscription_status` and `current_period_end`. `isActive()` then checks status *and* the period end on every request. The database also enforces it: the `scores` insert policy calls `is_active_subscriber()`.

**The rolling 5 scores rule lives in the database**, not only in JavaScript. `unique (user_id, played_on)` blocks two scores on one date, and an `AFTER INSERT` trigger deletes everything beyond the 5 most recent. Even if someone calls the API directly, the rule holds.

**Security is layered.** (1) middleware redirects logged-out users, (2) every admin page and action calls `requireAdmin()`, (3) Row Level Security in Postgres is the last lock. Normal users have no UPDATE policy on `profiles`, so nobody can make themselves admin. The service-role key is only used in server code after a permission check.

**The draw is two steps.** "Simulate" runs the engine and saves nothing. "Publish" takes the exact numbers the admin just saw, recomputes with live data, and writes `draws`, `draw_entries` and `winners`. `unique(draw_month)` stops a double publish.

**Prize maths** (`lib/draw.mjs`, covered by 10 tests): 40 / 35 / 25 split; winners in a tier split equally, rounded *down* so we never pay out more than the pool; only an unclaimed 5-match jackpot rolls over.

## 4. Decisions on ambiguous requirements

The PRD leaves these open. Each choice is a constant or a small function, easy to change.

1. **What is a "match"?** Draw numbers are 1 to 45, like scores. A player matches a number when one of their (distinct) saved scores equals it. Duplicate scores count once.
2. **Who is in a draw?** Every subscriber with an active plan at publish time, even with fewer than 5 scores (they just have fewer chances). A 5-match needs 5 different scores.
3. **How big is the pool?** 40% of each fee (`PRIZE_POOL_PERCENT`). A yearly plan contributes 1/12 per month so pools stay comparable.
4. **Charity share:** minimum 10% (PRD), maximum 50% (`MAX_CHARITY_PERCENT`) so the platform always keeps something.
5. **A 6th score with a date older than all 5 saved rounds** is rejected with a clear message, because the rolling rule would delete it immediately.
6. **Algorithmic draw:** weighted random. Every number has base weight 1, plus 1 for each time it appears in any active player's scores.
7. **Unclaimed 3- and 4-match pools do not roll over** (PRD only mentions the jackpot).
8. **Payment can only be marked "paid" after the proof is approved.** Verification flow: awaiting proof, submitted, approved or rejected (rejected can re-upload).
9. **Charity images** are URLs, not uploads, to keep the scope small.

## 5. Testing checklist (PRD 16.1)

- [ ] Sign up and log in; log-out hides the dashboard
- [ ] Subscribe monthly and yearly with the Stripe test card; dashboard turns Active
- [ ] Add 6 scores; only the newest 5 remain; a duplicate date is refused; edit and delete work
- [ ] Non-subscriber cannot add scores (UI and database)
- [ ] Admin: simulate a draw, publish it, see winners
- [ ] Winner uploads a screenshot; admin approves, then marks paid; user sees "Paid"
- [ ] Charity choice and percentage save; reports show contributions
- [ ] Charity search and filters; direct donation
- [ ] Layout works on a phone-sized screen

**Quick way to test a draw without waiting for real subscribers:** in `/admin/users/[id]`, set a few test users to `active`, give them scores, then simulate.

## 6. Scalability notes

- Business rules are in `lib/config.js` and `lib/draw.mjs`, separate from pages and the database.
- Heavy aggregation runs in SQL functions (`draw_inputs`, `admin_report`), which avoids the 1000-row API default limit.
- Adding a new draw type means one function in `lib/draw.mjs` plus one option in the admin form.
- Next steps if this grew: a `countries`/currency column, multiple charities per user, email notifications (Resend) when a draw publishes, a scheduled job (Vercel Cron) to open the monthly draw.
