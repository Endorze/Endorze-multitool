# Task Calendar Prototype

A modern Next.js prototype with:

- Google sign-in
- Calendar-based task planner
- Per-task urgency (`Normal`, `Important`, `Deadline`)
- Time picker for reminders
- One-click task completion with crossed-out state
- Browser push notifications (Chrome and other supported browsers)
- Email fallback reminders to the signed-in Google email
- Dockerized PostgreSQL for local development

## Tech stack

- Next.js (App Router)
- Auth.js with Google provider
- Prisma ORM
- PostgreSQL
- Resend for outgoing emails
- Web Push API + service worker for browser notifications

---

## 1. Prerequisites

Install these locally:

- Node.js 20.9+ (Node 22 LTS is a good pick)
- Docker Desktop
- Git
- A Google Cloud project
- A Resend account (or swap in AWS SES later)

You already have Docker, GitHub, AWS, and GCP, so you're in good shape.

---

## 2. Create the project

### Option A: use this starter directly

```bash
git clone <your-repo-url>
cd task-calendar-prototype
```

### Option B: create fresh and copy files in

```bash
npx create-next-app@latest task-calendar-prototype
```

Use:

- TypeScript: **Yes**
- ESLint: **Yes**
- Tailwind: **No** (this starter uses custom CSS)
- `src/` directory: **No**
- App Router: **Yes**

Then copy the files from this starter into the project.

---

## 3. Install dependencies

```bash
npm install
```

---

## 4. Start PostgreSQL with Docker

```bash
npm run db:up
```

That starts PostgreSQL on `localhost:5432` using the credentials from `docker-compose.yml`.

To stop it later:

```bash
npm run db:down
```

---

## 5. Configure environment variables

Copy the example file:

```bash
cp .env.example .env.local
```

Fill in these values.

### Required

- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `DATABASE_URL`
- `CRON_SECRET`

### For email reminders

- `RESEND_API_KEY`
- `EMAIL_FROM`

### For browser push reminders

Generate VAPID keys:

```bash
npm run vapid:generate
```

Paste the output into `.env.local`:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

---

## 6. Set up Google OAuth

1. Open **Google Cloud Console**.
2. Go to **Google Auth Platform** / OAuth client setup.
3. Create a **Web application** OAuth client.
4. Add these authorized redirect URIs:

### Local

```txt
http://localhost:3000/api/auth/callback/google
```

### Production

```txt
https://your-domain.com/api/auth/callback/google
```

5. Put the client ID and secret into `.env.local`.

---

## 7. Initialize the database

Generate Prisma client and create your database tables.

### For quick prototype work

```bash
npm run db:push
```

### For proper migrations

```bash
npm run db:migrate -- --name init
```

You can inspect the DB with:

```bash
npm run db:studio
```

---

## 8. Run the app

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

Sign in with Google and test the dashboard.

---

## 9. How reminders work

This prototype uses a protected route:

```txt
GET /api/cron/reminders
```

Send this header:

```txt
Authorization: Bearer YOUR_CRON_SECRET
```

### Logic included

- `Deadline` tasks:
  - send email **1 day before**
  - send email **same day**
- tasks with a time:
  - send push **1 hour before** if browser push exists
  - otherwise send email fallback
- default urgency is `NORMAL`

---

## 10. Run scheduled reminders locally

You can test the cron endpoint manually with curl:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/reminders
```

For local scheduling, simplest options are:

- Windows Task Scheduler
- a small cron job on Linux/macOS
- GitHub Actions hitting your deployed endpoint

---

## 11. Recommended production path

## Easiest prototype hosting

### App

Use **Vercel** for the Next.js app.

### Database

Use one of these:

- Neon / Supabase Postgres
- Cloud SQL (GCP)
- Amazon RDS PostgreSQL (AWS)

### Reminder cron

- Vercel cron jobs
- GitHub Actions
- Cloud Scheduler (GCP)
- EventBridge Scheduler (AWS)

### Email

- Resend for prototype simplicity
- AWS SES later if you want to consolidate on AWS

---

## 12. AWS deployment path

Good production combo:

- **Frontend/App:** AWS Amplify Hosting or ECS/Fargate or App Runner
- **Database:** Amazon RDS PostgreSQL
- **Scheduled reminders:** EventBridge Scheduler -> hit `/api/cron/reminders`
- **Email:** AWS SES

If you want the simplest AWS path, App Runner + RDS is a nice middle ground.

---

## 13. GCP deployment path

Good production combo:

- **Frontend/App:** Cloud Run
- **Database:** Cloud SQL for PostgreSQL
- **Scheduled reminders:** Cloud Scheduler -> hit `/api/cron/reminders`
- **Email:** Resend or SendGrid

Cloud Run + Cloud SQL is a very clean GCP setup.

---

## 14. Important prototype notes

### Why email is sent *to* the signed-in Gmail instead of *from* their Gmail

This keeps the prototype much simpler.

Sending from each user's actual Gmail account would require additional Gmail scopes, token handling, and likely more OAuth verification work. For a prototype, sending reminders **to** the authenticated email is the fastest path.

### Why push is optional

Web push only works after:

- service worker registration
- browser permission granted
- active push subscription stored in DB

So the app falls back to email when push is not available.

---

## 15. Suggested next upgrades

After the prototype works, I’d add these next:

1. drag-and-drop task ordering
2. recurring tasks
3. edit task modal
4. per-user notification preferences
5. multi-calendar views (month / week / day)
6. timezone-aware UI labels
7. mobile installability with a full PWA manifest
8. AWS SES or Gmail API sending if you want deeper mail control

---

## 16. File map

```txt
app/
  api/
    auth/[...nextauth]/route.ts
    cron/reminders/route.ts
    push/subscribe/route.ts
    push/test/route.ts
    tasks/route.ts
    tasks/[id]/toggle/route.ts
    tasks/[id]/delete/route.ts
    user/timezone/route.ts
  dashboard/page.tsx
  login/page.tsx
  globals.css
  layout.tsx
  page.tsx
components/
  push-manager.tsx
  sign-out-button.tsx
  task-calendar.tsx
  timezone-sync.tsx
lib/
  auth-helpers.ts
  notifications.ts
  prisma.ts
  utils.ts
prisma/
  schema.prisma
public/
  sw.js
scripts/
  generate-vapid.mjs
auth.ts
proxy.ts
docker-compose.yml
.env.example
README.md
```

---

## 17. Production cron examples

### GCP Cloud Scheduler

Create an HTTP job that calls:

```txt
https://your-domain.com/api/cron/reminders
```

Header:

```txt
Authorization: Bearer YOUR_CRON_SECRET
```

Frequency suggestion:

```txt
*/5 * * * *
```

### AWS EventBridge Scheduler

Trigger an HTTPS request to the same endpoint every 5 minutes.

---

## 18. If you want to improve this prototype further

Best next step is to replace the in-page date panel with:

- month calendar on the left
- animated slide-over agenda panel on the right
- task edit popover
- dedicated settings page

That would make it feel more like a polished SaaS product.
# Endorze-multitool
