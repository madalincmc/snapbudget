# SnapBudget

Track your expenses by photographing receipts — no manual entry. Snap a photo, OCR extracts the merchant, amount, and date, and the app auto-categorizes the spend.

## Stack

- **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS
- **Backend & DB**: Supabase (Postgres + Auth + Storage)
- **OCR**: Google Vision API
- **Payments**: Stripe
- **Hosting**: Vercel

## Project structure

```
app/         # Next.js App Router routes
components/  # Reusable UI components
lib/         # Client libraries, server utilities, integrations (Supabase, Stripe, OCR)
types/       # Shared TypeScript types
```

## Local setup

### Prerequisites

- Node.js 20+
- npm
- A Supabase project (Auth, Database, Storage enabled)
- A Google Cloud project with the Vision API enabled and a service account key
- A Stripe account (test mode is fine for development)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and fill in the values:

```bash
cp .env.example .env.local
```

| Variable                                                   | Description                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SITE_URL`                                     | Base URL of the app (`http://localhost:3000` locally)                    |
| `NEXT_PUBLIC_SUPABASE_URL`                                 | Supabase project URL                                                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`                            | Supabase anon/public key                                                 |
| `SUPABASE_SERVICE_ROLE_KEY`                                | Supabase service role key (server-side only, never expose to the client) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`                | Google OAuth credentials, wired into Supabase Auth's Google provider     |
| `GOOGLE_VISION_CREDENTIALS_BASE64`                         | Base64-encoded Google Cloud service account JSON, used for receipt OCR   |
| `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe API keys                                                          |
| `STRIPE_WEBHOOK_SECRET`                                    | Signing secret for the Stripe webhook endpoint                           |
| `STRIPE_PRICE_ID`                                          | Price ID for the SnapBudget subscription plan                            |

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Other scripts

```bash
npm run build          # Production build
npm run start           # Serve the production build
npm run lint            # ESLint
npm run format          # Prettier — write
npm run format:check    # Prettier — check only
```

## Deployment

The app is deployed to [Vercel](https://vercel.com), connected to this repository. Every pull request gets a preview deployment; merges to `main` deploy to production.

Environment variables must be configured in the Vercel project settings (Production, Preview, and Development) to match `.env.example`.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Enable the **Google** provider under Authentication > Providers, using your Google OAuth client ID/secret.
3. Create a Storage bucket for receipt images.
4. Copy the project URL and API keys into your environment variables.

## Branching

`main` is protected — changes land via pull request. Preview deployments are generated automatically for every PR.
