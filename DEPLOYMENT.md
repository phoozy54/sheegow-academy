# SHEEGOW ACADEMY — Deployment Guide

Deploy to production for free: **Vercel** (Next.js app) + **Neon** (Postgres database) + **Render** (chat service) + **Cloudflare** (DNS for sheegowacademy.com).

---

## Step 1 — Create the Neon Postgres database (5 min)

1. Go to **https://neon.tech** → Sign up with GitHub
2. Click **Create Project** → name it `sheegow-academy` → region `AWS US East` → Create
3. On the dashboard, find **Connection string** → click **Copy**
   - It looks like: `postgresql://neondb_owner:password@ep-xxx.us-east-2.aws.neon.tech/sheegow?sslmode=require`
4. **Save this string** — you'll paste it into Vercel next.

---

## Step 2 — Deploy the Next.js app to Vercel (10 min)

1. Go to **https://vercel.com/new** → sign in with GitHub
2. **Import** the `phoozy54/sheegow-academy` repository
3. Configure:
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `./` (default)
   - **Build Command:** `prisma generate && next build` (or leave default — `vercel.json` handles it)
   - **Install Command:** `bun install` (or `npm install`)
4. Open **Environment Variables** and add these:

   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | *(paste your Neon connection string from Step 1)* |
   | `JWT_SECRET` | *(generate: run `openssl rand -hex 32` in terminal, paste the result)* |
   | `JWT_REFRESH_SECRET` | *(generate another: `openssl rand -hex 32`)* |
   | `NEXT_PUBLIC_CHAT_URL` | *(leave empty for now — we'll add the Render URL in Step 4)* |
   | `NEXT_PUBLIC_APP_URL` | `https://sheegowacademy.com` |
   | `SUPER_ADMIN_PASSWORD` | *(strong password used by `bun run db:superadmin` in Step 4a)* |
   | `APP_ORIGIN` | `https://sheegowacademy.com,https://www.sheegowacademy.com` |
   | `DEMO_MODE` | `false` *(never enable mock payments in production)* |
   | `TURN_URL` | *(optional — coturn URL, e.g. `turn:turn.example.com:3478?transport=udp`)* |
   | `TURN_SECRET` | *(optional — coturn REST secret; short-lived credentials are minted server-side)* |

> **Security:** `JWT_SECRET` and `JWT_REFRESH_SECRET` are required in production —
> the app fails closed without them. `TURN_SECRET` must never use a `NEXT_PUBLIC_`
> prefix because those values are bundled into browser JavaScript. Also set the
> **same** `JWT_SECRET` on the chat service in Step 4.

5. Click **Deploy** — wait ~3 min. It will build and deploy.
6. You'll get a URL like `https://sheegow-academy-xxx.vercel.app`. **Save this.**
7. The first deploy may fail because the database is empty — that's OK, we'll fix it next.

---

## Step 3 — Push the database schema + seed data (2 min)

The database needs tables and an initial super admin. **No demo users or demo
courses are created** — students register themselves, the super admin creates
teachers, and teachers create their own courses and live classes.

Run this locally (or in any terminal with the repo):

```bash
cd sheegow-academy

# Set the Neon connection string temporarily
export DATABASE_URL="postgresql://neondb_owner:password@ep-xxx.us-east-2.aws.neon.tech/sheegow?sslmode=require"

# Create all tables
bun run db:push

# Seed the initial super admin (password comes from SUPER_ADMIN_PASSWORD)
# Set SUPER_ADMIN_PASSWORD first — see .env.example
bun prisma/seed.ts
```

You should see:
```
✅ Seed complete!
   Super admin password: from SUPER_ADMIN_PASSWORD.
   No demo accounts were created. Sign in as superadmin@sheegow.academy and add teachers.
```

**Creating / rotating the super admin on an existing database:**

```bash
# SUPER_ADMIN_PASSWORD must be set; this also rotates an existing password
bun run db:superadmin
```

Sign in at `superadmin@sheegow.academy` with your `SUPER_ADMIN_PASSWORD`, then
create teachers from **Admin → Teachers**. Only the super admin can create
teachers/admins and change roles. Teachers can create courses and live classes;
each teacher manages only their own classes. Students can sign up freely but
cannot join a paid class until they are enrolled and payment is completed.

Now **redeploy** on Vercel (push any commit to GitHub, or click "Redeploy" in Vercel). The app should work.

---

## Step 4 — Deploy the chat service to Render (5 min)

The Socket.io chat server needs its own host (Vercel can't run long-lived servers).

### Option A — One-click via Render Blueprint (recommended)
1. Go to **https://render.com** → sign in with GitHub
2. Click **New +** → **Blueprint**
3. Select the `phoozy54/sheegow-academy` repo
4. Render reads `render.yaml` and creates a web service `sheegow-chat` automatically
5. Click **Apply** — wait ~2 min for it to deploy
6. You'll get a URL like `https://sheegow-chat.onrender.com`. **Save this.**

### Option B — Manual
1. Go to **https://render.com** → sign in with GitHub
2. **New +** → **Web Service**
3. Select `phoozy54/sheegow-academy` repo
4. Settings:
   - **Name:** `sheegow-chat`
   - **Root Directory:** `mini-services/chat-service`
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node index.js`
   - **Plan:** Free
5. **Create Web Service** — wait ~2 min
6. Copy the URL (e.g. `https://sheegow-chat.onrender.com`)

> **Chat service environment variables:** set `JWT_SECRET` on Render to the
> **same value** used by the Next.js app (from Step 2) so the service can verify
> the short-lived, class-scoped socket tokens. Optionally set `APP_ORIGIN` to a
> comma-separated allowlist of your allowed browser origins (defaults to the
> academy domain). No database or TURN credentials are needed here.

> **Live video note:** this service also relays WebRTC signaling for real
> camera/microphone classes. After any change to `mini-services/chat-service`,
> trigger a **manual deploy** on Render so the new signaling events are live.
> The app's live room uses native WebRTC over HTTPS — no Agora account needed.

---

## Step 5 — Connect the chat service to the app (1 min)

1. Go back to **Vercel** → your `sheegow-academy` project → **Settings** → **Environment Variables**
2. Edit `NEXT_PUBLIC_CHAT_URL` → paste your Render chat URL: `https://sheegow-chat.onrender.com`
3. **Redeploy** (Vercel → Deployments → click the ⋮ on latest → Redeploy)

---

## Step 6 — Connect your Cloudflare domain (3 min)

1. Go to **Cloudflare Dashboard** → select **sheegowacademy.com**
2. Click **DNS** → **Records** → **Add record**

### Add the apex domain (sheegowacademy.com):
| Type | Name | Content | Proxy | TTL |
|------|------|---------|-------|-----|
| `CNAME` | `@` | `cname.vercel-dns.com` | DNS only (gray) | Auto |

### Add the www subdomain:
| Type | Name | Content | Proxy | TTL |
|------|------|---------|-------|-----|
| `CNAME` | `www` | `cname.vercel-dns.com` | DNS only (gray) | Auto |

> **Note:** Set Proxy status to **DNS only (gray cloud)**. If you proxy (orange cloud), Cloudflare will interfere with Vercel's SSL. You can enable proxying later if you want Cloudflare's CDN features.

3. Click **Save** on each.

---

## Step 7 — Add the domain in Vercel (2 min)

1. Go to **Vercel** → your project → **Settings** → **Domains**
2. Click **Add** → type `sheegowacademy.com` → click Add
3. Add `www.sheegowacademy.com` as the primary domain. Set `sheegowacademy.com` to redirect **to www** (the canonical origin used by every `rel="canonical"` tag and the sitemap).
4. Vercel will show "Invalid Configuration" for a few minutes — that's normal, it's waiting for DNS to propagate.
5. Wait 5-10 min, refresh → it should show **Valid Configuration** with a green checkmark.
6. Vercel issues the SSL certificate automatically. Your site is now live at `https://www.sheegowacademy.com`!

---

## Step 8 — Verify everything works

Visit **https://www.sheegowacademy.com** and test:
- [ ] Home page loads with hero and real courses (no fake testimonials/stats)
- [ ] Click "Log in" → sign in with `superadmin@sheegow.academy` and your
      `SUPER_ADMIN_PASSWORD` → lands in the dashboard
- [ ] Admin → Teachers → create a teacher (only the super admin can do this)
- [ ] Sign in as that teacher → create a course and a live class
- [ ] Sign up as a student → you can browse, but joining a paid class shows a
      payment/enrollment message until payment is completed
- [ ] Teacher opens the live room → **Start Camera & Mic**; student sees the stream
- [ ] Try sending a chat message — should appear instantly
- [ ] On your phone — should be responsive

---

## Troubleshooting

### "Database connection failed" on Vercel
- Check `DATABASE_URL` env var is set correctly (starts with `postgresql://`, ends with `?sslmode=require`)
- Make sure you ran `db:push` and `seed.ts` against the Neon database

### Chat doesn't connect in production
- Verify `NEXT_PUBLIC_CHAT_URL` is set to your Render URL (with `https://`)
- Render free services sleep after 15 min — the first message may take ~30s to wake it up. Upgrade to Render Starter ($7/mo) to keep it always-on.

### Live video / microphone doesn't work
- The domain **must be HTTPS** — browsers block camera/mic on `http://` (localhost is fine)
- Open the live room and check the **"Connected"** badge in the header. If it says
  **"Connecting…"**, the signaling socket isn't reaching the chat service — recheck
  `NEXT_PUBLIC_CHAT_URL` and redeploy Render after changing `mini-services/chat-service`.
- The teacher must click **Start Now** → **View Room** → **Start Camera & Mic**. Students
  receive the stream automatically; if autoplay is blocked they tap **Enable audio**.
- Public STUN is configured. If some students see a blank video, add a **coturn TURN
  server** with the server-side `TURN_URL` and `TURN_SECRET` variables on Vercel and
  redeploy. The app mints short-lived credentials via `/api/rtc/ice` — never use
  `NEXT_PUBLIC_TURN_*`, which would expose the secret in browser JavaScript.

### Domain shows "Invalid Configuration" on Vercel
- Wait 10-30 min for DNS propagation
- Verify the CNAME records point to `cname.vercel-dns.com` exactly
- Make sure Cloudflare proxy is OFF (gray cloud)

### 404 on API routes
- Make sure the build succeeded (check Vercel build logs)
- Prisma client must be generated — `vercel.json` handles this via the build command

---

## Architecture summary

```
sheegowacademy.com (Cloudflare DNS)
       │
       ▼
   Vercel (Next.js app + API routes)
       │
       ├── Neon (Postgres database)
       │
       └── Render (Socket.io chat service)
              ▼
          sheegow-chat.onrender.com
```

All free tier. Auto-deploys on every `git push` to `main`.

## Ongoing costs
- **Vercel:** Free (Hobby plan — covers your traffic)
- **Neon:** Free (0.5 GB storage, enough for thousands of users)
- **Render:** Free (chat service sleeps after 15 min inactivity — first chat message takes ~30s to wake)
- **Cloudflare:** Free (DNS management)
- **Total: $0/month**

If you need the chat to be always-on (no sleep), upgrade Render to Starter ($7/month).
