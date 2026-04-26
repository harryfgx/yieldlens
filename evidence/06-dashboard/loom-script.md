# YieldLens — 4-Minute Loom Walkthrough Script

## 0:00–0:15 — Hook

> "If you're thinking about buying a London property as an investment, how do you actually know if it's a good deal? Most investors jump between Rightmove, Land Registry, and spreadsheets — with no unified view. YieldLens fixes that."

_Show: Landing page hero with tagline._

## 0:15–0:45 — App Tour (Homepage)

> "YieldLens combines real HM Land Registry transactions, ONS house price and rental indices, police crime data, and EPC attributes into one decision-support tool."

_Show: Scroll through homepage — novel insight card, three CTA tiles (Analyse, Compare, History). Click through to About page briefly to show data sources and methodology._

## 0:45–2:00 — Live Query: Analyse a Property

> "Let's analyse a real property. I'll enter a postcode in SE16 — Bermondsey — a 2-bed flat at £400,000 with expected rent of £1,800 per month."

_Show: Navigate to /analyse. Fill in the form: SE16 7PB, 2 bedrooms, Flat, £400,000, £1,800, 25% deposit. Select a mortgage product. Submit._

> "The composite score combines four factors: yield, capital growth, risk, and cashflow — weighted 35/25/20/20. We can see the verdict, the breakdown, and how interest-only compares to repayment."

_Show: Results card with score, verdict badge, four progress bars. Scroll to mortgage comparison cards and cashflow bar chart. Point out comparables table._

## 2:00–3:00 — Historical Drill-Down and Compare

> "Now let's look at how SE16 has performed historically — drilling down from postcode sector to outcode to area to the whole London region."

_Show: Navigate to /history/SE16. Point out the four stacked trend charts and key findings._

> "And we can compare multiple areas side by side."

_Show: Navigate to /compare. Add SE16, E14, SW11, N1. Show comparison cards and quadrant scatter plot._

## 3:00–3:45 — Code and Architecture

> "Under the hood, this is a Next.js 15 app with tRPC, Drizzle ORM, and Supabase Postgres. The composite score query joins six tables with CTEs, window functions, and a stored PL/pgSQL function for mortgage calculations."

_Show: Briefly show the ERD (evidence/01-erd), then the composite score SQL (evidence/05-sql-queries/q3-composite-score.sql). Mention all queries benchmark under 40ms p50._

## 3:45–4:00 — Closing

> "YieldLens turns fragmented public data into actionable investment intelligence. The full source code is on GitHub, and the live app is deployed on Vercel. Thanks for watching."

_Show: Landing page with Live Demo link. End._
