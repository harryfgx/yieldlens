"use client";

import { api } from "~/trpc/react";
import { Skeleton } from "~/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { AlertCircle } from "lucide-react";

const QUADRANT_META: Record<string, { color: string; bg: string; label: string }> = {
  UNICORN: { color: "#84cc16", bg: "bg-lime-50", label: "Unicorn — High yield + High growth" },
  CASH_COW: { color: "#14b8a6", bg: "bg-teal-50", label: "Cash Cow — High yield + Low growth" },
  GROWTH_PLAY: { color: "#38bdf8", bg: "bg-sky-50", label: "Growth Play — Low yield + High growth" },
  AVOID: { color: "#ef4444", bg: "bg-red-50", label: "Avoid — Low yield + Low growth" },
};

export default function QuadrantPage() {
  const { data, isLoading, isError, error } = api.analytics.quadrant.useQuery();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-3xl font-bold">Yield vs Growth Quadrant</h1>
        <Skeleton className="mt-6 h-96 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-3xl font-bold">Yield vs Growth Quadrant</h1>
        <Alert variant="destructive" className="mt-6">
          <AlertCircle className="size-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-3xl font-bold">Yield vs Growth Quadrant</h1>
        <p className="mt-4 text-muted-foreground">No data available.</p>
      </div>
    );
  }

  const xVals = data.map((d) => d.yoy_price_growth_pct);
  const yVals = data.map((d) => d.avg_yield_pct);
  const xMin = Math.min(...xVals);
  const xMax = Math.max(...xVals);
  const yMin = Math.min(...yVals);
  const yMax = Math.max(...yVals);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold">Yield vs Growth Quadrant</h1>
      <p className="mt-1 text-muted-foreground">
        All London outcodes classified by yield and capital growth performance.
      </p>

      <div
        className="relative mx-auto mt-6 h-[500px] w-full rounded-lg border bg-muted/30"
        role="img"
        aria-label={`Scatter plot of ${data.length} London outcodes showing yield vs growth. Quadrants: UNICORN (top-right), CASH_COW (bottom-right), GROWTH_PLAY (top-left), AVOID (bottom-left).`}
      >
        {/* Quadrant backgrounds */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2" data-testid="quadrant-backgrounds">
          <div className="rounded-tl-lg bg-sky-50" data-testid="bg-GROWTH_PLAY" />
          <div className="rounded-tr-lg bg-lime-50" data-testid="bg-UNICORN" />
          <div className="rounded-bl-lg bg-red-50" data-testid="bg-AVOID" />
          <div className="rounded-br-lg bg-teal-50" data-testid="bg-CASH_COW" />
        </div>

        {/* Axis labels */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
          YoY Price Growth % →
        </div>
        <div className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-muted-foreground">
          Avg Yield % →
        </div>

        {/* Data points */}
        {data.map((d) => {
          const xPct = ((d.yoy_price_growth_pct - xMin) / xRange) * 80 + 10;
          const yPct = 90 - ((d.avg_yield_pct - yMin) / yRange) * 80;
          const meta = QUADRANT_META[d.quadrant];
          return (
            <div
              key={d.outcode}
              className="group absolute z-10"
              style={{ left: `${xPct}%`, top: `${yPct}%` }}
              data-testid="quadrant-dot"
            >
              <div
                className="size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white shadow"
                style={{ backgroundColor: meta?.color ?? "#888" }}
              />
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-background px-1 text-[10px] font-medium opacity-0 shadow transition-opacity group-hover:opacity-100">
                {d.outcode}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4">
        {Object.entries(QUADRANT_META).map(([key, meta]) => (
          <div key={key} className="flex items-center gap-2 text-sm">
            <div
              className="size-3 rounded-full"
              style={{ backgroundColor: meta.color }}
            />
            <span>{meta.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
