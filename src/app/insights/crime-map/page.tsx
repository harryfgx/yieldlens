"use client";

import { api } from "~/trpc/react";
import { Skeleton } from "~/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export default function CrimeMapPage() {
  const { data, isLoading, isError, error } = api.analytics.crimeByBorough.useQuery();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-3xl font-bold">Crime Rate Map</h1>
        <Skeleton className="mt-6 h-96 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-3xl font-bold">Crime Rate Map</h1>
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
        <h1 className="text-3xl font-bold">Crime Rate Map</h1>
        <p className="mt-4 text-muted-foreground">No crime data available.</p>
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => a.crime_rate - b.crime_rate);
  const safest = sorted.slice(0, 5);
  const leastSafe = sorted.slice(-5).reverse();
  const maxRate = Math.max(...data.map((d) => d.crime_rate));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold">Crime Rate Map</h1>
      <p className="mt-1 text-muted-foreground">
        Borough-level crime rates across London (last 12 months).
      </p>

      {/* Choropleth-style bar visualization */}
      <div
        className="mt-6 space-y-1"
        role="img"
        aria-label={`Crime rate visualization. Safest: ${safest.map((s) => s.borough).join(", ")}. Least safe: ${leastSafe.map((s) => s.borough).join(", ")}.`}
      >
        {sorted.map((d) => {
          const pct = maxRate > 0 ? (d.crime_rate / maxRate) * 100 : 0;
          // Green (safe) to Red (high crime)
          const hue = Math.round((1 - d.crime_rate / maxRate) * 120);
          return (
            <div key={d.borough} className="flex items-center gap-2 text-sm">
              <span className="w-40 truncate text-right font-medium">{d.borough}</span>
              <div className="flex-1">
                <div
                  className="h-5 rounded-sm transition-all"
                  style={{
                    width: `${Math.max(pct, 2)}%`,
                    backgroundColor: `hsl(${hue}, 70%, 50%)`,
                  }}
                />
              </div>
              <span className="w-16 text-right text-xs text-muted-foreground">
                {d.crime_rate.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-3 w-20 rounded-sm bg-gradient-to-r from-green-500 to-red-500" />
        <span>Low crime → High crime (crimes per LSOA per month)</span>
      </div>

      {/* Summary cards */}
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-green-700">Top 5 Safest Boroughs</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-inside list-decimal space-y-1 text-sm">
              {safest.map((s) => (
                <li key={s.borough}>
                  {s.borough} — {s.crime_rate.toFixed(1)} per LSOA/month
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-red-700">Top 5 Least Safe Boroughs</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-inside list-decimal space-y-1 text-sm">
              {leastSafe.map((s) => (
                <li key={s.borough}>
                  {s.borough} — {s.crime_rate.toFixed(1)} per LSOA/month
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
