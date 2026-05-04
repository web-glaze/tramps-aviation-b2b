# Tramps Aviation — B2B Portal

> Next.js 14 (App Router) frontend for the Tramps Aviation agent + customer
> travel booking platform. Pairs with the NestJS backend
> (`tramps-aviation-backend`) and the React admin (`tramps-aviation-admin`).

---

## Tech stack

| Concern             | Choice                                                            |
| ------------------- | ----------------------------------------------------------------- |
| Framework           | **Next.js 14 (App Router)** with React Server Components          |
| Language            | TypeScript                                                        |
| Styling             | **Tailwind CSS** + shadcn/ui (Radix primitives)                   |
| Icons               | `lucide-react`                                                    |
| Client state        | **Zustand** stores in `lib/store/*`                               |
| Server data         | `@tanstack/react-query`                                           |
| Forms               | `react-hook-form` + `zod`                                         |
| HTTP                | `axios` — JWT auto-attached via interceptor                       |
| Notifications       | `sonner` toast                                                    |
| Theming             | `next-themes`                                                     |
| Charts              | `recharts`                                                        |
| Payments            | Razorpay Checkout (`@/lib/razorpay.ts`)                           |

---

## Quick start

This repo uses **Yarn** (pinned via `packageManager: yarn@1.22.22` in
`package.json`). Use `yarn`, not `npm` — `package-lock.json` is
git-ignored on purpose.

```bash
# 1. Install
yarn install

# 2. Environment — copy and fill
cp .env.example .env.local
#   NEXT_PUBLIC_API_URL=http://localhost:3000/api
#   NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxx

# 3. Dev server
yarn dev             # http://localhost:3001

# 4. Production
yarn build
yarn start
```

Required services for full local stack:
- Backend on `http://localhost:3000` (`tramps-aviation-backend`)
- MongoDB (used by backend)
- Redis is optional — backend falls back to in-memory cache automatically

---

## Folder structure

```
tramps-aviation-b2b/
├── app/                              ← App Router pages
│   ├── layout.tsx                    ← Root layout (theme, query provider, fonts)
│   ├── page.tsx                      ← Public landing / home
│   │
│   ├── flights/page.tsx              ← Public flight search (mirrored to /b2b)
│   ├── hotels/page.tsx               ← Public hotel search
│   ├── series-fare/page.tsx          ← Public series fare search
│   ├── insurance/page.tsx            ← Public insurance plans
│   │
│   └── b2b/                          ← Authenticated B2B portal
│       ├── layout.tsx                ← Auth gate + B2B navbar
│       ├── login, register, kyc, forgot-password
│       ├── dashboard
│       ├── flights, hotels, series-fare, insurance   ← Wrappers around public pages
│       ├── bookings, [bookingId]
│       ├── wallet, markup, commission
│       ├── reports, profile, help
│
├── components/
│   ├── booking/SeriesFareBookingDialog.tsx   ← In-place booking modal
│   ├── dashboard/                            ← Stats, charts, activity widgets
│   ├── layout/                               ← Header, Footer, PublicPageChrome
│   ├── shared/                               ← AuthGuard, AppLogo, MarkupSettings
│   └── ui/                                   ← shadcn primitives
│
├── lib/
│   ├── api/
│   │   ├── client.ts                 ← apiClient (authed) + publicApiClient
│   │   └── services.ts               ← agentApi, customerApi, searchApi, paymentApi
│   ├── store/                        ← Zustand: auth, wallet, platform, settings, filters
│   ├── hooks/                        ← useDisplayPrice, useMarkupRules, usePersistedState
│   └── razorpay.ts                   ← Razorpay Checkout SDK helper
│
├── config/
│   ├── app.ts                        ← B2B nav config, route constants
│   └── theme.ts                      ← Brand tokens (azure + orange)
│
├── public/                           ← Static assets (logo.svg, etc.)
├── middleware.ts                     ← Edge auth gate
├── tailwind.config.ts
├── next.config.js
├── tsconfig.json
├── package.json
│
├── amplify.yml                       ← AWS Amplify CI/CD
├── netlify.toml                      ← Netlify CI/CD
└── vercel.json                       ← Vercel CI/CD
```

---

## API client layout

`lib/api/client.ts` exposes two axios instances:

* **`apiClient`** — base URL from `NEXT_PUBLIC_API_URL`. Request interceptor
  reads `auth_token` from `localStorage` and adds `Authorization: Bearer …`.
  Response interceptor maps 401 to a silent token refresh, then redirects
  to `/b2b/login` only on actual portal pages.
* **`publicApiClient`** — same base URL, no auth header. Used for genuinely
  public reads (search, autocomplete) so anonymous users don't trip the
  auth pipeline.

`lib/api/services.ts` groups endpoints by audience:

| Object        | Audience          | Highlights                                                                       |
| ------------- | ----------------- | -------------------------------------------------------------------------------- |
| `agentApi`    | Authenticated B2B | profile, KYC, wallet, `initBooking`, `confirmB2bBooking`, `createBookingPaymentOrder`, `verifyBookingPayment`, `cancelBooking` |
| `customerApi` | Authenticated B2C | profile, bookings, refunds                                                       |
| `searchApi`   | Public            | `searchFlights`, `searchHotels`, `searchSeriesFares`, `searchAirports`, `searchCities`, `searchInsurance`, `revalidateFlight` |
| `paymentApi`  | Public            | `createOrder`, `verifyPayment`                                                   |
| `commonApi`   | Public            | banners, popular content, CMS pages                                              |

---

## Booking flow (B2B agent)

```
Search → InitBooking → confirmB2bBooking (wallet)
                    └→ createBookingPaymentOrder + Razorpay → verifyBookingPayment
                                                                   ↓
                                                     PNR + e-ticket email
```

Concurrency safety mirrored across all booking modals:
* `bookingInProgressRef` — synchronous mutex blocks double-clicks
* `idempotencyKeyRef` — stable across network retries (backend dedupes)
* `pendingBookingRefRef` — Step 1 success preserved across Step 2 retries

---

## Edge middleware

`middleware.ts` runs before every request that matches its `matcher`:

* **Public pages**: `/`, `/flights`, `/hotels`, `/insurance`, `/series-fare`,
  `/faq`, `/privacy`, `/terms`, `/refund`, `/about` — no token required.
* **B2B auth pages**: `/b2b/login`, `/b2b/register`, `/b2b/kyc`,
  `/b2b/forgot-password`, `/b2b/reset-password` — no token required.
* **Everything else under `/b2b/*`** — token required. Without one, redirect
  to `/b2b/login?redirect=<original-path>`.

---

## Pricing model

| Concern                  | Owner | UI                                  |
| ------------------------ | ----- | ----------------------------------- |
| Per-product markup %     | Admin | `/admin/settings → Pricing`         |
| Per-product enable flags | Admin | `/admin/settings → Feature toggles` |
| Search-time markup       | Auto  | `useDisplayPrice` hook              |
| Wallet ledger            | Auto  | Backend atomic debit/credit         |
| Commission attach        | Auto  | Backend, agent-only                 |
| Booking-time PNR         | Admin | Pre-loaded pool per series fare     |

Agents have no markup controls — admin sets percentages globally and
toggles which products allow markup / commission. Sub-agents see the
same prices their parent agent sees but cannot configure anything.

---

## Useful scripts

```bash
yarn dev      # start with HMR (port 3001 by default)
yarn build    # production build → .next/
yarn start    # serve the build
yarn lint     # eslint
```

---

## Environment variables (`.env.local`)

```
# Required
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Optional
NEXT_PUBLIC_APP_NAME=Tramps Aviation
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
```

Never commit `.env*` files — `.gitignore` covers all variants by default
and only `.env.example` / `.env.sample` are allowlisted as templates.

---

## Git — first push (step by step)

If you've just run `git init` and want to push to a remote (GitHub /
GitLab / Bitbucket / CodeCommit) and use `main` as the default branch:

```bash
# Inside D:\Web App\tramps-aviation\tramps-aviation-b2b

# 1. Rename the default branch (works whether the current branch is
#    `master` or already `main` — `-M` is force-rename).
git branch -M main

# 2. Verify .gitignore covers node_modules, .next, .env etc.
type .gitignore        # Windows  (or `cat .gitignore` in bash)

# 3. Stage everything that's not ignored
git add .

# 4. First commit
git commit -m "chore: initial commit — Tramps Aviation B2B portal"

# 5. Add the remote (paste the HTTPS or SSH URL from your git host)
git remote add origin https://github.com/<your-org>/tramps-aviation-b2b.git
#   ── if you already added one earlier and want to swap it ──
#   git remote set-url origin https://github.com/<your-org>/tramps-aviation-b2b.git

# 6. Push and set upstream
git push -u origin main

# 7. (Optional) confirm
git status
git remote -v
git branch -a
```

If GitHub asks for credentials, use a Personal Access Token instead of
your password (Settings → Developer settings → Personal access tokens).

---

## Deployment

Three CI/CD configs ship with the repo. Pick whichever target you're
deploying to and just push to the configured branch — the build picks up
automatically.

### AWS Amplify (primary)

`amplify.yml` is auto-detected by Amplify.

1. **Connect repo** in the Amplify console → choose the `main` branch.
2. **Environment variables** — set in Amplify console under
   *App settings → Environment variables*:
   * `NEXT_PUBLIC_API_URL=https://api.your-domain.com/api`
   * `NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxx`
3. **Build settings** — Amplify reads `amplify.yml` at the repo root.
   Build runs `npm ci` + `npm run build`, output comes from `.next/`.
4. Amplify handles SSR through the AWS Lambda@Edge integration
   automatically — no extra config needed.

First deploy after connecting the repo is one click.

### Netlify

`netlify.toml` declares the Next.js plugin.

1. **Sites → Add new site → Import from Git** in Netlify dashboard.
2. Pick the `main` branch.
3. Build command and publish dir come from `netlify.toml` automatically.
4. Set the env vars (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`)
   in *Site settings → Build & deploy → Environment*.
5. The `@netlify/plugin-nextjs` plugin handles SSR / API routes.

### Vercel

`vercel.json` documents the build for the GitHub integration & CLI.

```bash
npx vercel              # interactive — first time only
npx vercel --prod       # deploy current branch to production
```

Or hook the repo to Vercel via the dashboard — Vercel detects Next.js
without any config, but the file pins env-var requirements and the
build command for clarity.

---

## Documentation

* `tramps-aviation-backend/docs/API_AND_ARCHITECTURE.md` — backend deep dive
  (modules, routes, schemas, TBO integration, booking lifecycle).
* `README.md` (this file) — frontend reference.

---

## License

Private. All rights reserved.
