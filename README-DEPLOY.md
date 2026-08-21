# SenderX — Deployment Guide for Netlify

Complete cold email hyper-personalized platform with AI (Groq). Ready to deploy on Netlify.

## Quick Deploy (3 steps)

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "SenderX v1.0 — final"
git branch -M main
git remote add origin https://github.com/your-username/senderx.git
git push -u origin main
```

### Step 2 — Import on Netlify
1. Go to https://app.netlify.com → **Add new site** → **Import existing project**
2. Pick your GitHub repo
3. Build settings auto-detected from `netlify.toml`:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
   - **Node version**: 20
4. Click **Deploy site**

### Step 3 — Set Environment Variables
On Netlify → **Site settings → Environment variables**, add:

| Key | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres.liaierxhlbrtrrmephou:Smartsolutions-3001@aws-0-ca-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true` | Supabase transaction pooler |
| `DIRECT_URL` | `postgresql://postgres.liaierxhlbrtrrmephou:Smartsolutions-3001@aws-0-ca-central-1.pooler.supabase.com:5432/postgres` | Supabase session pooler (for migrations) |
| `SUPABASE_DATABASE_URL` | (same as DATABASE_URL) | Override var — bypasses any platform injection |
| `GROQ_API_KEY` | `gsk_your_real_key_here` | Get it free at https://console.groq.com/keys |
| `AI_PROVIDER` | `groq` | Default provider |
| `AI_MODEL` | `llama-3.3-70b-versatile` | Default model (free on Groq) |
| `NEXT_PUBLIC_BASE_URL` | `https://your-site-name.netlify.app` | Replace with your actual Netlify URL |

Then **Trigger redeploy** so the new env vars take effect.

---

## Database Setup (Supabase)

The Prisma schema is already in sync with Supabase. If you need to push the schema again:

```bash
# Local
npx prisma db push --accept-data-loss

# Or via Supabase Studio SQL Editor (run prisma/schema.sql)
```

The schema creates 7 tables:
- `Setting` (AI config KV store)
- `Sender` (SMTP/IMAP email accounts)
- `Campaign` (Cold email campaigns)
- `CampaignSender` (campaign-sender pivot)
- `Lead` (CSV-imported leads)
- `Email` (Generated/sent emails)
- `Reply` (IMAP-synced replies)

---

## AI Provider Setup (Groq)

1. Get a free API key at https://console.groq.com/keys
2. Set `GROQ_API_KEY` in Netlify env vars (and locally in `.env`)
3. Optionally switch models in Settings UI or via `AI_MODEL` env var

**Available Groq models:**
- `llama-3.3-70b-versatile` (default — best quality)
- `llama-3.1-8b-instant` (fastest, cheapest)
- `mixtral-8x7b-32768` (long context)
- `gemma2-9b-it` (alternative)

**Switching to OpenRouter (optional):**
1. Set `OPENROUTER_API_KEY` env var
2. Set `AI_PROVIDER=openrouter`
3. Set `AI_MODEL=meta-llama/llama-3.3-70b-instruct`

---

## Cron Jobs (Optional — Netlify Scheduled Functions)

SenderX has two cron endpoints that should run periodically:

### `/api/cron/send` — Process queued emails
- Trigger: every 15 minutes during business hours (9-18 Mon-Fri)
- Sends queued cold emails respecting:
  - 40-second throttle between sends
  - 25 emails/day per sender limit
  - Sending window (9-18h, skip weekends)
  - A/B variant assignment

### `/api/cron/inbox` — Sync replies via IMAP
- Trigger: every 30 minutes
- Fetches new replies via IMAP
- Detects bounces (mailer-daemon, delivery failure, etc.)
- Matches replies to leads by `In-Reply-To` header or from email
- Updates lead status to `replied` or `bounced`

### Setup scheduled functions:
1. Requires Netlify Pro/Teams plan
2. On Netlify UI: **Functions → Scheduled functions → Add**
3. Configure cron expressions:
   - `*/15 9-18 * * 1-5` for send
   - `*/30 * * * *` for inbox
4. Set header `Authorization: Bearer $CRON_SECRET` (optional security)

---

## Local Development

```bash
# 1. Install deps
npm install --legacy-peer-deps

# 2. Generate Prisma client
npx prisma generate

# 3. Push schema to Supabase (first time only)
npx prisma db push

# 4. Start dev server
npm run dev
# App runs at http://localhost:3000
```

---

## Feature Overview

### Cold Email Engine
- **SMTP sending** with 40s throttle
- **25 emails/day per sender** limit (auto-resets at midnight)
- **IMAP Sent folder sync** (every sent email appears in your Sent folder)
- **Sending window** 9-18h local time, skip weekends (configurable per campaign)
- **List-Unsubscribe header** + tracking pixel + click tracking

### AI Personalization (Groq)
- Generate sniper emails referencing lead's company/role/website
- Generate 3 follow-up templates (shared across campaign, with `{{firstName}}`, `{{company}}`, `{{lastName}}` template vars)
- Auto-qualify leads against ICP (0-100 score)
- JSON-mode prompts (model returns structured data)

### Cross-Campaign Deduplication (3 layers)
1. Exact email match
2. Email + company match
3. SHA-256 email hash match

### Auto-Backup Safety Net (12 triggers)
Pre-send, post-import, pre-migrate, pre-restore, pre-reset, pre-push, pre-campaign-delete, pre-lead-delete, pre-sender-delete, pre-settings-change, pre-sequence-generate, pre-qualify.
Each trigger exports all 7 tables to `/db/backups/backup-{trigger}-{timestamp}.json`.

### A/B Testing
- Auto-assign leads to variant A/B (round-robin)
- Per-lead variant tracking
- Compare open/click/reply rates by variant

---

## File Structure

```
senderx/
├── prisma/
│   └── schema.prisma              # 7 models: Setting, Sender, Campaign, CampaignSender, Lead, Email, Reply
├── src/
│   ├── app/
│   │   ├── api/                   # 26 API routes
│   │   │   ├── stats/             # Dashboard KPIs
│   │   │   ├── campaigns/         # CRUD + sequence generation
│   │   │   ├── senders/           # CRUD + SMTP/IMAP tests
│   │   │   ├── leads/             # CRUD + import + AI qualification
│   │   │   ├── emails/            # CRUD + AI generation
│   │   │   ├── settings/          # AI config KV store
│   │   │   ├── track/             # Open/click/unsubscribe
│   │   │   ├── db/                # Backup/restore
│   │   │   └── cron/              # send + inbox
│   │   ├── layout.tsx
│   │   ├── page.tsx               # SPA shell with 5 views
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                    # 21 shadcn/ui components
│   │   └── views/                 # 5 main views
│   ├── lib/
│   │   ├── db.ts                  # Prisma client (SUPABASE_DATABASE_URL override)
│   │   ├── ai-provider.ts         # Groq-first AI wrapper
│   │   ├── email-sender.ts        # SMTP + 40s throttle + 25/day limit + IMAP Sent append
│   │   ├── inbox-sync.ts          # IMAP reply sync + bounce detection
│   │   ├── tracking.ts            # Open/click tracking
│   │   ├── auto-backup.ts         # 12-trigger safety net
│   │   ├── settings.ts            # KV settings store
│   │   ├── safe-fetch.ts          # Retry + timeout wrapper
│   │   └── utils.ts
│   └── hooks/
│       └── use-toast.ts
├── scripts/
│   ├── safe-push.ts               # Pre-push backup + prisma db push
│   ├── backup-data.ts             # Export all data
│   └── restore-data.ts            # Restore from backup
├── netlify.toml                   # Netlify config (Next.js plugin + headers + security)
├── .env.example                   # All required env vars documented
├── package.json                   # postinstall: prisma generate
├── next.config.ts                 # ignoreBuildErrors: true, no standalone
└── README-DEPLOY.md               # This file
```

---

## Troubleshooting

### Build fails on Netlify with "Prisma Client not found"
✅ Already fixed — `package.json` has `"postinstall": "prisma generate"`. If it still fails, manually add `npx prisma generate` to your build command on Netlify UI.

### DATABASE_URL points to SQLite on Z.ai
✅ Already fixed — `src/lib/db.ts` uses `SUPABASE_DATABASE_URL` as datasource override. On Netlify this is not an issue (Netlify respects `.env` vars you set).

### "No API key configured for AI provider"
Set `GROQ_API_KEY` in Netlify → Site settings → Environment variables. Then redeploy.

### Cron not running
Requires Netlify Pro/Teams plan. Setup scheduled functions manually in Netlify UI.

### IMAP/SMTP test fails
Check sender credentials in **Senders** view. Common issues:
- Gmail: enable IMAP + generate App Password (regular password won't work)
- Outlook/Hotmail: enable IMAP in account settings
- Custom SMTP: check port (587 STARTTLS, 465 SSL)

### 25/day limit not resetting
The reset happens at midnight in the server's timezone. On Netlify functions run in UTC. To force a reset, edit the sender and save (auto-resets counter).
