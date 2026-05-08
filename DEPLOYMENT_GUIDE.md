# Tramps Aviation B2B (Agent Portal) — Deployment Guide

> Step-by-step deployment of the B2B Next.js agent portal to AWS Amplify
> with a custom subdomain (`agents.trampsaviation.com`).
>
> **Time:** 30-45 min first time. **Cost:** $0-5/month for typical traffic.

---

## Architecture

```
Hostinger DNS                AWS Amplify
┌──────────────┐            ┌─────────────────────┐
│ agents.tramps │ ─CNAME──→ │ tramps-aviation-b2b │
│ aviation.com  │            │ branch: main         │
└──────────────┘            │ Next.js SSR          │
                            └──────────┬──────────┘
                                       │
                                       ▼
                            https://api.trampsaviation.com
                            (NestJS backend on EC2)
```

The B2B app is a Next.js 15 app with the same architecture as B2C — just a
different consumer. Both apps share the same backend API.

---

## Prerequisites

- AWS account (with billing set up)
- Backend already deployed at `api.trampsaviation.com` (see
  [`tramps-aviation-backend/README.md`](../tramps-aviation-backend/README.md))
- B2C already deployed at `www.trampsaviation.com` (see
  [`tramps-aviation-b2c/DEPLOYMENT_GUIDE.md`](../tramps-aviation-b2c/DEPLOYMENT_GUIDE.md))
  — order doesn't matter, but the patterns are identical
- Hostinger domain `trampsaviation.com` with DNS access
- GitHub repo `tramps-aviation-b2b` (private) with the latest code on `main`

---

## Step 1 — Push code to GitHub

If not already done:

```powershell
cd "D:\Web App\tramps-aviation\tramps-aviation-b2b"
git init
git add .
git commit -m "Initial commit"
git branch -M main
# Create a new private repo on github.com first, then:
git remote add origin https://github.com/YOUR_USERNAME/tramps-aviation-b2b.git
git push -u origin main
```

---

## Step 2 — Create the Amplify app

1. AWS Console → search **Amplify** → **Create new app** → "Host web app"
2. **Source:** GitHub → click **Authorise AWS Amplify** if first time
3. Pick repo: `tramps-aviation-b2b`, branch: `main`
4. **App name:** `tramps-aviation-b2b`
5. Build settings — Amplify auto-detects Next.js. Verify the YAML matches:

```yaml
version: 1
applications:
  - frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
          - .next/cache/**/*
```

6. Click **Advanced settings** → **Environment variables** and add:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.trampsaviation.com/api` |
| `NEXT_PUBLIC_APP_URL` | `https://agents.trampsaviation.com` |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | `rzp_live_xxxxxx` (same key as backend) |
| `NEXT_PUBLIC_B2C_URL` | `https://www.trampsaviation.com` |
| `NODE_OPTIONS` | `--max-old-space-size=4096` (prevents OOM in build) |

7. Click **Save and deploy**.
8. First build takes 5-8 min. You'll get a temporary URL like
   `https://main.d12abc34xyz.amplifyapp.com` — open it to verify the agent
   portal loads.

---

## Step 3 — Add custom domain

1. In Amplify → your `tramps-aviation-b2b` app → **Domain management** →
   **Add domain**.
2. Enter `trampsaviation.com` (root domain — Amplify will let you map only
   the `agents` subdomain).
3. On the next screen:
   - Sub-domain: `agents`
   - Branch: `main`
   - Click **Configure domain**.
4. Amplify shows you 2-4 DNS records (CNAMEs for SSL validation + the
   subdomain itself).

5. **In Hostinger DNS,** add each Amplify-provided record exactly:

| Type | Name | Value | TTL |
|---|---|---|---|
| CNAME | `agents` | `xxxxxxxxxx.cloudfront.net` (Amplify-provided) | 300 |
| CNAME | `_xxxxxxx` (validation) | `_yyyyyyy.acm-validations.aws` (Amplify-provided) | 300 |

6. Wait 10-30 minutes. Amplify will:
   - Validate ownership via the `_xxxx` CNAME
   - Issue an ACM SSL certificate automatically
   - Mark the status as "Available" once everything's green

7. Hit `https://agents.trampsaviation.com` — agent portal loads with valid
   SSL. Done.

---

## Step 4 — Auto-deploy on push

Already enabled by default. From now on, every `git push origin main` will:

1. Trigger an Amplify webhook
2. Amplify pulls the latest commit, runs `npm ci && npm run build`
3. Deploys the new `.next` artifacts behind the same domain
4. Sends you an email if the build fails (configure the alert in Amplify
   settings)

**Roll back** a bad deploy: Amplify → your app → **Deployments** → click
the previous green deploy → **Redeploy this version**.

---

## Step 5 — Lock down agent-only access (optional but recommended)

If you want to gate the entire site behind a basic-auth password while still
in private beta (before agents are onboarded), enable Amplify's **Access
control**:

1. Amplify → app → **Access control**
2. Set username + password (e.g. `tramps:beta2026`)
3. Save — the whole site is now password-protected.

Remove this once you go public.

---

## Step 6 — Final checks

- [ ] Agent can reach the login screen at `https://agents.trampsaviation.com/login`
- [ ] Agent can register a new account (creates entry in MongoDB Atlas)
- [ ] Wallet balance loads from API
- [ ] Flight search returns real results from TBO
- [ ] Booking flow ends at a successful PNR (use a `₹1` test fare first)
- [ ] CSP / CORS — no errors in browser console
- [ ] Mobile responsive (use Chrome devtools mobile emulator)
- [ ] Sentry / error tracking configured (recommended)

---

## Updating the B2B app

```powershell
cd "D:\Web App\tramps-aviation\tramps-aviation-b2b"
# make changes
git add .
git commit -m "Improve agent dashboard"
git push origin main
# Amplify auto-builds + deploys in 5-8 min
```

---

## Common issues

**Build fails: "Module not found: @/components/..."**
→ Path alias mismatch. Check `tsconfig.json` has:
```json
{ "compilerOptions": { "paths": { "@/*": ["./*"] } } }
```

**Build fails: "JavaScript heap out of memory"**
→ Add env var `NODE_OPTIONS=--max-old-space-size=4096` and rebuild.

**API returns CORS error in browser**
→ Backend's `CORS_ORIGINS` env doesn't include `https://agents.trampsaviation.com`.
SSH into EC2, edit `.env`, add the URL, then `pm2 restart tramps-api`.

**Site shows raw HTML / no styles**
→ Tailwind PostCSS config missing. Verify `postcss.config.js` exists and
includes `tailwindcss`. Re-deploy.

**Custom domain stuck on "Pending verification"**
→ DNS records not propagated yet, OR Hostinger added a trailing dot.
Check with:
```bash
nslookup -type=CNAME _xxxxxxx.trampsaviation.com 8.8.8.8
```
If it doesn't resolve, re-add the record without the trailing dot.

**Agent login works but every API call fails 401**
→ JWT token from backend isn't reaching the API. Likely the token is being
saved to localStorage on `agents.trampsaviation.com` but API is at
`api.trampsaviation.com` — that's fine. Open Devtools → Network →
verify the `Authorization: Bearer` header is being sent. If not, your
axios interceptor might not be reading the token; check
`lib/api/client.ts` in the b2b repo.

---

## Comparison: B2B vs B2C deployment

| Aspect | B2C | B2B |
|---|---|---|
| Domain | `www.trampsaviation.com` | `agents.trampsaviation.com` |
| Hosting | AWS Amplify | AWS Amplify (same setup) |
| Backend | Same API at `api.trampsaviation.com` | Same |
| Build | Next.js | Next.js |
| Auto-deploy | Yes (on `main` push) | Yes |
| Cost | ~$0-5/mo | ~$0-5/mo |
| Custom domain | Yes | Yes |
| SSL | ACM (free, auto-issued) | ACM (free, auto-issued) |

Both apps follow identical Amplify setup — the only differences are the
subdomain CNAME and the env var values.

---

## Hostinger DNS final state

After both B2C and B2B are deployed, your Hostinger DNS should look like:

| Type | Name | Value | Purpose |
|---|---|---|---|
| A | api | EC2 public IP | Backend |
| CNAME | www | xxx.cloudfront.net (Amplify B2C) | B2C site |
| CNAME | agents | yyy.cloudfront.net (Amplify B2B) | B2B portal |
| CNAME | admin | zzz.cloudfront.net (CloudFront) | Admin SPA |
| CNAME | _abc123 | acm-validations.aws | SSL validation B2C |
| CNAME | _def456 | acm-validations.aws | SSL validation B2B |
| MX | @ | (your email host) | Email |

---

## Cost summary

| Item | Cost |
|---|---|
| Amplify hosting | $0 base + ~$0.01 per GB transferred (typical: $1-5/month) |
| Amplify build minutes | First 1000 build min/month free, then $0.01/min |
| Custom domain SSL | $0 (ACM is free) |
| **Total B2B** | **$0-5/month** for typical traffic |

Combined infra (B2B + B2C + admin S3 + EC2 + MongoDB) typically runs
**$20-25/month** for the first 10k bookings.

---

That's the entire pipeline. Bookmark this file. After first deploy, future
updates are just `git push origin main` — Amplify handles the rest.

For backend-specific issues, see
[`../tramps-aviation-backend/README.md`](../tramps-aviation-backend/README.md).
For the customer-side Amplify guide, see
[`../tramps-aviation-b2c/DEPLOYMENT_GUIDE.md`](../tramps-aviation-b2c/DEPLOYMENT_GUIDE.md).
