"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { toast } from "sonner";
import { BarChart } from "@tremor/react";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { AlertCircle } from "lucide-react";

const QUADRANT_COLORS: Record<string, string> = {
  CASH_COW: "text-teal-600",
  GROWTH_PLAY: "text-sky-600",
  UNICORN: "text-lime-600",
  AVOID: "text-red-600",
};

function extractOutcode(postcode: string): string {
  return postcode.replace(/\s/g, "").slice(0, -3).toUpperCase();
}

export default function ComparePage() {
  const [postcodes, setPostcodes] = useState<string[]>([""]);
  const [input, setInput] = useState("");

  const outcodes = postcodes
    .filter((p) => p.length >= 5)
    .map(extractOutcode)
    .filter(Boolean);

  const snapshot = api.analytics.compareSnapshot.useQuery(
    { outcodes },
    { enabled: outcodes.length > 0 },
  );

  function addPostcode() {
    if (postcodes.length >= 4) {
      toast("Maximum 4 postcodes reached");
      return;
    }
    if (!input.trim()) return;
    setPostcodes([...postcodes, input.trim().toUpperCase()]);
    setInput("");
  }

  function removePostcode(idx: number) {
    setPostcodes(postcodes.filter((_, i) => i !== idx));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addPostcode();
    }
  }

  const data = snapshot.data ?? [];

  const yieldChartData = data.map((d) => ({
    outcode: d.outcode,
    "Avg Yield %": d.avg_yield_pct,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold">Compare Postcodes</h1>
      <p className="mt-1 text-muted-foreground">
        Compare up to 4 London postcodes side-by-side.
      </p>

      <div className="mt-6 flex gap-2">
        <Input
          placeholder="e.g. SE16 7PB"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Add postcode"
        />
        <Button
          onClick={addPostcode}
          aria-label="Add postcode"
        >
          <Plus className="mr-1 size-4" aria-hidden="true" /> Add
        </Button>
      </div>

      {/* Postcode cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {postcodes.map((pc, i) => {
          const oc = pc.length >= 5 ? extractOutcode(pc) : "";
          const match = data.find((d) => d.outcode === oc);
          return (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  {pc || "Empty"}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removePostcode(i)}
                  aria-label={`Remove ${pc}`}
                  className="size-6"
                >
                  <X className="size-3" />
                </Button>
              </CardHeader>
              <CardContent>
                {snapshot.isLoading && oc ? (
                  <Skeleton className="h-20 w-full" />
                ) : match ? (
                  <div className="space-y-1 text-sm">
                    <p>
                      Outcode: <span className="font-semibold">{match.outcode}</span>
                    </p>
                    <p>
                      Median price:{" "}
                      <span className="font-semibold">
                        £{match.median_price_12m.toLocaleString("en-GB", { maximumFractionDigits: 0 })}
                      </span>
                    </p>
                    <p>
                      Avg yield: <span className="font-semibold">{match.avg_yield_pct.toFixed(2)}%</span>
                    </p>
                    <p>
                      YoY growth: <span className="font-semibold">{match.yoy_growth_pct.toFixed(2)}%</span>
                    </p>
                    <p>
                      Crime index: <span className="font-semibold">{match.crime_rate_index.toFixed(1)}</span>
                    </p>
                    <Badge className={QUADRANT_COLORS[match.quadrant] ?? ""} variant="outline">
                      {match.quadrant.replace("_", " ")}
                    </Badge>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {pc ? "No data found" : "Enter a postcode"}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Yield bar chart */}
      {data.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">Yield Comparison</h2>
          <BarChart
            data={yieldChartData}
            index="outcode"
            categories={["Avg Yield %"]}
            colors={["teal"]}
            yAxisWidth={50}
            aria-label={`Yield comparison across ${data.map((d) => d.outcode).join(", ")}`}
          />
        </div>
      )}

      {/* Scatter plot */}
      {data.length > 0 && <QuadrantScatter data={data} />}

      {snapshot.isError && (
        <Alert variant="destructive" className="mt-6">
          <AlertCircle className="size-4" />
          <AlertTitle>Error loading comparison</AlertTitle>
          <AlertDescription>{snapshot.error.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function QuadrantScatter({
  data,
}: {
  data: {
    outcode: string;
    avg_yield_pct: number;
    yoy_growth_pct: number;
    quadrant: string;
  }[];
}) {
  const QUADRANT_BG: Record<string, string> = {
    UNICORN: "#84cc16",
    CASH_COW: "#14b8a6",
    GROWTH_PLAY: "#38bdf8",
    AVOID: "#ef4444",
  };

  return (
    <div className="mt-8">
      <h2 className="mb-4 text-xl font-semibold">Yield vs Growth Quadrant</h2>
      <div
        className="relative mx-auto h-80 w-full max-w-2xl rounded-lg border bg-muted/30"
        role="img"
        aria-label={`Scatter plot showing ${data.length} outcodes: ${data.map((d) => `${d.outcode} (${d.quadrant.replace("_", " ")})`).join(", ")}`}
      >
        {/* Quadrant backgrounds */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          <div className="rounded-tl-lg bg-sky-50" title="GROWTH_PLAY" />
          <div className="rounded-tr-lg bg-lime-50" title="UNICORN" />
          <div className="rounded-bl-lg bg-red-50" title="AVOID" />
          <div className="rounded-br-lg bg-teal-50" title="CASH_COW" />
        </div>
        {/* Axis labels */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
          YoY Growth % →
        </div>
        <div className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-muted-foreground">
          Yield % →
        </div>
        {/* Data points */}
        {data.map((d) => {
          const xMin = Math.min(...data.map((p) => p.yoy_growth_pct));
          const xMax = Math.max(...data.map((p) => p.yoy_growth_pct));
          const yMin = Math.min(...data.map((p) => p.avg_yield_pct));
          const yMax = Math.max(...data.map((p) => p.avg_yield_pct));
          const xRange = xMax - xMin || 1;
          const yRange = yMax - yMin || 1;
          const xPct = ((d.yoy_growth_pct - xMin) / xRange) * 80 + 10;
          const yPct = 90 - ((d.avg_yield_pct - yMin) / yRange) * 80;
          return (
            <div
              key={d.outcode}
              className="group absolute z-10"
              style={{ left: `${xPct}%`, top: `${yPct}%` }}
            >
              <div
                className="size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white shadow"
                style={{ backgroundColor: QUADRANT_BG[d.quadrant] ?? "#888" }}
              />
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-background px-1 text-[10px] font-medium opacity-0 shadow transition-opacity group-hover:opacity-100">
                {d.outcode}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
