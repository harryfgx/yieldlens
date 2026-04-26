"use client";

import Link from "next/link";
import { LineChart } from "@tremor/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";

type DrilldownRow = {
  geo_level: string;
  geo_value: string;
  month: string;
  avg_price: number | null;
  rolling_12m_avg: number | null;
  yoy_growth_pct: number | null;
};

type Finding = {
  title: string;
  description: string;
  value: string;
};

const GEO_LEVELS = [
  { key: "postcode_sector", title: "Postcode sector trend" },
  { key: "outcode", title: "Outcode trend" },
  { key: "area", title: "Area trend" },
  { key: "region", title: "London region trend" },
] as const;

export function HistoryClient({
  outcode,
  drilldown,
  findings,
}: {
  outcode: string;
  drilldown: DrilldownRow[];
  findings: Finding[];
}) {
  const areaMatch = /^[A-Z]+/.exec(outcode);
  const area = areaMatch ? areaMatch[0] : outcode;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/history">Historical</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/history/${area}`}>{area}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{outcode}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="mt-4 text-3xl font-bold">Historical Trends — {outcode}</h1>
      <p className="mt-1 text-muted-foreground">
        Multi-level price trends from postcode sector to London region.
      </p>

      <div className="mt-8 space-y-8">
        {GEO_LEVELS.map((level) => {
          const levelData = drilldown.filter((r) => r.geo_level === level.key);
          if (levelData.length === 0) return null;

          const chartData = levelData.map((r) => ({
            month: r.month.substring(0, 7),
            "Rolling 12m Avg": r.rolling_12m_avg ?? 0,
            "YoY Growth %": r.yoy_growth_pct ?? 0,
          }));

          const geoValue = levelData[0]?.geo_value ?? level.key;
          const lastRow = levelData[levelData.length - 1];
          const trendDesc = lastRow?.yoy_growth_pct
            ? `${geoValue}: ${lastRow.yoy_growth_pct > 0 ? "+" : ""}${lastRow.yoy_growth_pct.toFixed(1)}% YoY`
            : `${geoValue} trend`;

          return (
            <div key={level.key} data-testid={`chart-${level.key}`}>
              <h2 className="mb-2 text-lg font-semibold">{level.title}</h2>
              <div className="mb-1 flex gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded bg-blue-500" /> Rolling 12m Avg</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded bg-emerald-500" /> YoY Growth %</span>
              </div>
              <div role="img" aria-label={`12-month rolling average trend for ${trendDesc}`}>
                <LineChart
                  data={chartData}
                  index="month"
                  categories={["Rolling 12m Avg", "YoY Growth %"]}
                  colors={["blue", "emerald"]}
                  yAxisWidth={70}
                  showLegend={false}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Key Findings */}
      <div className="mt-10">
        <h2 className="mb-4 text-xl font-semibold">Key Findings</h2>
        {findings.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {findings.map((f, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{f.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{f.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Alert>
            <AlertCircle className="size-4" />
            <AlertTitle>No findings</AlertTitle>
            <AlertDescription>
              Findings will appear once historical data is loaded.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
