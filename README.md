# SnapBudget

Track your expenses by photographing receipts — no manual entry. Snap a photo, OCR extracts the merchant, amount, and date, and the app auto-categorizes the spend. Expenses without a receipt (cash, parking, etc.) can be logged manually, and the dashboard surfaces month-over-month trends so spending patterns are visible at a glance, not just totals.

## Screenshots

<table>
  <tr>
    <td align="center" width="33%">
      <img src="docs/screenshots/login.jpg" alt="Sign in with Google" width="260"><br>
      <sub>Sign in with Google</sub>
    </td>
    <td align="center" width="33%">
      <img src="docs/screenshots/receipt-scan.jpg" alt="Photograph or upload a receipt" width="260"><br>
      <sub>Photograph or upload a receipt</sub>
    </td>
    <td align="center" width="33%">
      <img src="docs/screenshots/history.jpg" alt="Searchable, filterable expense history" width="260"><br>
      <sub>Searchable, filterable history</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="33%">
      <img src="docs/screenshots/dashboard-overview.jpg" alt="Dashboard: monthly comparison and trend insights" width="260"><br>
      <sub>Monthly comparison & trend insights</sub>
    </td>
    <td align="center" width="33%">
      <img src="docs/screenshots/dashboard-trend.jpg" alt="Dashboard: 30-day spending chart and category breakdown" width="260"><br>
      <sub>30-day spending chart & category breakdown</sub>
    </td>
    <td width="33%"></td>
  </tr>
</table>

## Features

- **Receipt scanning** — photograph or upload a receipt; Google Vision OCR extracts merchant, amount, and date, and the spend is auto-categorized.
- **Manual expenses** — log cash, parking, and other receipt-less spending directly.
- **Recurring expenses** — rent, subscriptions, utilities and insurance are added automatically on a weekly, monthly or yearly schedule; pause, resume, edit or delete a rule at any time.
- **Dashboard insights** — current vs. previous month comparison, average daily spend, top category, biggest expense, and a 30-day spending chart that shades the current month apart from the previous one.
- **Category breakdown** — spending by category for the current month, with a searchable category/subcategory picker when logging an expense.
- **History** — search, filter (category, month), and sort every expense, receipt or manual.
- **Google sign-in** — auth via Supabase, no separate SnapBudget password.

## Stack

- **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS
- **Backend & DB**: Supabase (Postgres + Auth + Storage)
- **OCR**: Google Vision API
- **Payments**: Stripe — env vars are scaffolded (see below) but billing isn't wired into the product yet
- **Hosting**: Vercel

## Project structure

```
app/             # Next.js App Router routes
components/      # Reusable UI components
lib/             # Client libraries, server utilities, integrations (Supabase, OCR)
types/           # Shared TypeScript types
docs/screenshots/  # Images used in this README
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
