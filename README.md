# YieldLens

**Know if a London property is a good investment before you buy.**

🌐 [Live Demo](https://yieldlens-opal.vercel.app) · 📦 [GitHub](https://github.com/harryfgx/yieldlens)

---

## Problem Statement

The UK buy-to-let market has become increasingly complex for individual investors. Section 24 tax changes have eroded mortgage interest relief, minimum EPC regulations threaten older stock, and interest rates have risen sharply since 2022. Yet most investors still evaluate properties using fragmented tools — jumping between Rightmove, Land Registry, ONS statistics, and police crime maps — with no unified view of whether a property is actually a good investment. YieldLens solves this by combining real HM Land Registry transactions, ONS house price and rental indices, police crime data, and EPC attributes into a single composite investment score, comparables analysis, mortgage scenario model, and multi-level historical drill-down for any London postcode.

## Features

- 🏠 **Composite Investment Score** — 0-100 score combining yield (35%), capital growth (25%), risk (20%), and cashflow (20%)
- 📊 **Comparables Analysis** — percentile-based pricing against recent local sales
- 💰 **Mortgage Scenarios** — interest-only vs repayment side-by-side with cashflow charts
- 📈 **Historical Drill-Down** — postcode sector → outcode → area → London region trends
- 🗺️ **Quadrant Classification** — yield vs growth scatter for all London outcodes
- 🔒 **Crime Choropleth** — borough-level crime rate map
- 🔍 **Compare** — up to 4 postcodes side-by-side

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| ORM | Drizzle |
| Database | Supabase Postgres (London region) |
| API | tRPC + Zod |
| UI | shadcn/ui + Tailwind CSS |
| Charts | Tremor + Nivo |
| Hosting | Vercel |
| CI | GitHub Actions |

## Data Sources

All data is sourced under the [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/) unless otherwise noted.

| Source | Use |
|---|---|
| HM Land Registry Price Paid Data | Property transactions |
| ONS House Price Index | Price trends by outcode |
| ONS Private Rental Prices Index | Rental yield estimates |
| data.police.uk | Crime statistics by LSOA |
| EPC Register | Property attributes (bedrooms, floor area, EPC rating) |
| ONS Postcode Directory | Geographic hierarchy |
| BTL Mortgage Rates (manual capture) | Mortgage scenario modelling |

## Setup Instructions

```bash
# Clone
git clone https://github.com/harryfgx/yieldlens.git
cd yieldlens

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Fill in your Supabase connection strings in .env

# Push schema to database
pnpm db:push

# Ingest data (requires populated database)
pnpm ingest:all

# Start development server
pnpm dev
```

## Project Structure

```
yieldlens/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components (shadcn/ui)
│   ├── lib/              # Utility functions
│   ├── server/
│   │   ├── api/          # tRPC routers
│   │   └── db/           # Drizzle schema
│   └── trpc/             # tRPC client setup
├── scripts/              # ETL, benchmarks, verification
├── docs/                 # Supporting documentation
├── evidence/             # Evidence artefacts for report
├── drizzle/              # SQL migrations
└── public/               # Static assets
```

## Licence

[MIT](./LICENSE)

## Acknowledgements

This project was built for the QMUL IOT552U 002 Project Report. Thanks to:

- **Jonathan Jackson** — Module Organiser
- **Seth Zenz** — Programme Director
- **Richard Gunton** — Lecturer (Data Reporting & Visualisation)
- HM Land Registry, ONS, data.police.uk, EPC Register — for open data under OGL v3.0
