"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BarChart3, AlertCircle } from "lucide-react";
import { BarChart } from "@tremor/react";

import { api } from "~/trpc/react";
import { analyseInputSchema, type AnalyseInput } from "~/lib/analyse-schema";
import { calculateMonthlyPayment } from "~/lib/mortgage";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Progress } from "~/components/ui/progress";
import { Slider } from "~/components/ui/slider";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";

const PROPERTY_TYPES = [
  { value: "DETACHED", label: "Detached" },
  { value: "SEMI_DETACHED", label: "Semi-Detached" },
  { value: "TERRACED", label: "Terraced" },
  { value: "FLAT", label: "Flat" },
  { value: "OTHER", label: "Other" },
] as const;

const VERDICT_EMOJI: Record<string, string> = {
  CASH_COW: "💰",
  GROWTH_PLAY: "📈",
  UNICORN: "🦄",
  AVOID: "⚠️",
};

function scoreColor(score: number) {
  if (score > 60) return "bg-green-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function scoreBadgeVariant(score: number): "default" | "secondary" | "destructive" {
  if (score > 60) return "default";
  if (score >= 40) return "secondary";
  return "destructive";
}

export default function AnalysePage() {
  const form = useForm<AnalyseInput>({
    resolver: zodResolver(analyseInputSchema),
    defaultValues: {
      postcode: "",
      bedrooms: 2,
      propertyType: "FLAT",
      askingPrice: 0,
      expectedMonthlyRent: 0,
      depositPct: 25,
      mortgageProductId: 0,
    },
  });

  const [submitted, setSubmitted] = useState<AnalyseInput | null>(null);

  const mortgageProducts = api.analytics.listMortgageProducts.useQuery();

  const scoreQuery = api.analytics.compositeScore.useQuery(
    submitted
      ? {
          postcode: submitted.postcode,
          bedrooms: submitted.bedrooms,
          propertyType: submitted.propertyType,
          askingPrice: submitted.askingPrice,
          expectedMonthlyRent: submitted.expectedMonthlyRent,
          depositPct: submitted.depositPct,
          mortgageProductId: submitted.mortgageProductId,
        }
      : undefined!,
    { enabled: !!submitted },
  );

  const compQuery = api.analytics.comparables.useQuery(
    submitted
      ? {
          postcode: submitted.postcode,
          bedrooms: submitted.bedrooms,
          propertyType: submitted.propertyType,
          floorAreaSqm: 70,
        }
      : undefined!,
    { enabled: !!submitted },
  );

  function onSubmit(data: AnalyseInput) {
    setSubmitted({ ...data });
  }

  const selectedProduct = mortgageProducts.data?.find(
    (p) => Number(p.mortgage_product_id) === form.watch("mortgageProductId"),
  );

  const isLoading = scoreQuery.isLoading && !!submitted;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold">Property Analyser</h1>
      <p className="mt-1 text-muted-foreground">
        Enter property details to get a composite investment score with mortgage scenarios.
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="postcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Postcode</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. SE16 7PB" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bedrooms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bedrooms</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(Number(v))}
                    value={String(field.value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Bedrooms" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="propertyType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PROPERTY_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="askingPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asking Price (£)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g. 400000"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expectedMonthlyRent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Monthly Rent (£)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g. 1800"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mortgageProductId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mortgage Product</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(Number(v))}
                    value={field.value ? String(field.value) : ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {mortgageProducts.data?.map((p) => (
                        <SelectItem
                          key={String(p.mortgage_product_id)}
                          value={String(p.mortgage_product_id)}
                        >
                          {String(p.lender)} — {String(p.product_name)} ({String(p.initial_rate_pct)}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="depositPct"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Deposit: {field.value}%</FormLabel>
                <FormControl>
                  <Slider
                    min={5}
                    max={50}
                    step={1}
                    value={[field.value]}
                    onValueChange={([v]) => field.onChange(v)}
                    aria-label="Deposit percentage"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full md:w-auto"
          >
            {isLoading ? "Analysing…" : "Analyse Property"}
          </Button>
        </form>
      </Form>

      {/* Empty state */}
      {!scoreQuery.data && !isLoading && !scoreQuery.isError && (
        <div className="mt-12 flex flex-col items-center gap-2 text-muted-foreground">
          <BarChart3 className="size-12" aria-hidden="true" />
          <p>Enter a property above to analyse</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="mt-8 space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {/* Error */}
      {scoreQuery.isError && (
        <Alert variant="destructive" className="mt-8">
          <AlertCircle className="size-4" />
          <AlertTitle>Analysis failed</AlertTitle>
          <AlertDescription className="flex items-center gap-2">
            {scoreQuery.error.message}
            <Button variant="outline" size="sm" onClick={() => scoreQuery.refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {scoreQuery.data && (
        <div className="mt-8 space-y-6">
          <ResultsCard data={scoreQuery.data} />
          <MortgageScenarios
            askingPrice={submitted?.askingPrice ?? 0}
            depositPct={submitted?.depositPct ?? 25}
            expectedMonthlyRent={submitted?.expectedMonthlyRent ?? 0}
            selectedProduct={selectedProduct}
            serverMonthlyPayment={scoreQuery.data.monthlyPayment}
          />
          <ComparablesTable
            data={compQuery.data}
            isLoading={compQuery.isLoading}
          />
        </div>
      )}
    </div>
  );
}

function ResultsCard({
  data,
}: {
  data: {
    compositeScore: number;
    verdict: string;
    components: {
      yieldScore: number;
      growthScore: number;
      riskScore: number;
      cashflowScore: number;
    };
    grossYieldPct: number;
    netYieldPct: number;
  };
}) {
  const components = [
    { label: "Yield", value: data.components.yieldScore },
    { label: "Capital Growth", value: data.components.growthScore },
    { label: "Risk (Low Crime + Low Volatility)", value: data.components.riskScore },
    { label: "Cashflow", value: data.components.cashflowScore },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Badge
            variant={scoreBadgeVariant(data.compositeScore)}
            className="text-lg px-3 py-1"
          >
            {data.compositeScore.toFixed(1)}
          </Badge>
          <Badge variant="outline" className="text-lg px-3 py-1">
            {VERDICT_EMOJI[data.verdict] ?? ""} {data.verdict.replace("_", " ")}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {components.map((c) => (
          <div key={c.label}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{c.label}</span>
              <span>{c.value}%</span>
            </div>
            <Progress value={c.value} className={scoreColor(c.value)} />
          </div>
        ))}

        <div className="mt-4 grid grid-cols-2 gap-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{data.grossYieldPct.toFixed(2)}%</p>
                    <p className="text-xs text-muted-foreground">Gross Yield</p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>Annual rent / asking price × 100</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{data.netYieldPct.toFixed(2)}%</p>
                    <p className="text-xs text-muted-foreground">Net Yield</p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                (Annual rent − 25% costs) / asking price × 100
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}

function MortgageScenarios({
  askingPrice,
  depositPct,
  expectedMonthlyRent,
  selectedProduct,
  serverMonthlyPayment,
}: {
  askingPrice: number;
  depositPct: number;
  expectedMonthlyRent: number;
  selectedProduct: Record<string, unknown> | undefined;
  serverMonthlyPayment: number;
}) {
  const loanAmount = askingPrice * (1 - depositPct / 100);
  const rate = Number(selectedProduct?.initial_rate_pct ?? 5);
  const termYears = 25;

  const ioPayment = calculateMonthlyPayment(loanAmount, rate, termYears, "INTEREST_ONLY");
  const repaymentPayment = calculateMonthlyPayment(loanAmount, rate, termYears, "REPAYMENT");

  const costs = expectedMonthlyRent * 0.25;

  const scenarios = [
    {
      title: "Interest-Only",
      monthly: ioPayment,
      totalPaid: ioPayment * termYears * 12,
      remainingBalance: loanAmount,
    },
    {
      title: "Repayment",
      monthly: repaymentPayment,
      totalPaid: repaymentPayment * termYears * 12,
      remainingBalance: 0,
    },
  ];

  const chartData = scenarios.map((s) => ({
    scenario: s.title,
    "Rent Income": Math.round(expectedMonthlyRent),
    "Mortgage Payment": Math.round(s.monthly),
    "Costs (25%)": Math.round(costs),
    "Net Cashflow": Math.round(expectedMonthlyRent - s.monthly - costs),
  }));

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Mortgage Scenarios</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {scenarios.map((s) => {
          const serverDiff = Math.abs(s.monthly - serverMonthlyPayment);
          return (
            <Card key={s.title}>
              <CardHeader>
                <CardTitle>{s.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  Monthly payment:{" "}
                  <span className="font-semibold">£{s.monthly.toFixed(2)}</span>
                </p>
                {serverDiff > 1 && (
                  <p className="italic text-muted-foreground">
                    Server: £{serverMonthlyPayment.toFixed(2)}
                  </p>
                )}
                <p>
                  Total paid over {termYears}yr:{" "}
                  <span className="font-semibold">
                    £{s.totalPaid.toLocaleString("en-GB", { maximumFractionDigits: 0 })}
                  </span>
                </p>
                <p>
                  Remaining balance:{" "}
                  <span className="font-semibold">
                    £{s.remainingBalance.toLocaleString("en-GB", { maximumFractionDigits: 0 })}
                  </span>
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <BarChart
        data={chartData}
        index="scenario"
        categories={["Rent Income", "Mortgage Payment", "Costs (25%)", "Net Cashflow"]}
        colors={["emerald", "rose", "amber", "blue"]}
        yAxisWidth={60}
        aria-label={`Mortgage cashflow comparison: Interest-Only net £${chartData[0] ? Math.round(chartData[0]["Net Cashflow"]) : 0}/mo vs Repayment net £${chartData[1] ? Math.round(chartData[1]["Net Cashflow"]) : 0}/mo`}
      />
    </div>
  );
}

function ComparablesTable({
  data,
  isLoading,
}: {
  data:
    | {
        comparable_count: number;
        comparables: {
          area: string;
          sale_date: string;
          sale_price: number;
          gbp_per_sqft: number | null;
          bedrooms: number;
        }[];
      }
    | undefined;
  isLoading: boolean;
}) {
  const [sortKey, setSortKey] = useState<"sale_date" | "sale_price" | "gbp_per_sqft">("sale_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (!data) return null;

  if (data.comparable_count < 3) {
    return (
      <Alert>
        <AlertCircle className="size-4" />
        <AlertTitle>Limited comparables</AlertTitle>
        <AlertDescription>
          Only {data.comparable_count} comparable{data.comparable_count !== 1 ? "s" : ""} found — consider widening criteria.
        </AlertDescription>
      </Alert>
    );
  }

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = [...data.comparables].sort((a, b) => {
    const av = sortKey === "sale_date" ? new Date(a[sortKey]).getTime() : (a[sortKey] ?? 0);
    const bv = sortKey === "sale_date" ? new Date(b[sortKey]).getTime() : (b[sortKey] ?? 0);
    return sortDir === "asc" ? Number(av) - Number(bv) : Number(bv) - Number(av);
  });

  const arrow = (key: typeof sortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold">Comparables ({data.comparable_count})</h2>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Area</TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("sale_date")}
              >
                Sale Date{arrow("sale_date")}
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("sale_price")}
              >
                Sale Price{arrow("sale_price")}
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("gbp_per_sqft")}
              >
                £/sqft{arrow("gbp_per_sqft")}
              </TableHead>
              <TableHead>Bedrooms</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((c, i) => (
              <TableRow key={i}>
                <TableCell>{c.area}</TableCell>
                <TableCell>{new Date(c.sale_date).toLocaleDateString("en-GB")}</TableCell>
                <TableCell>
                  £{c.sale_price.toLocaleString("en-GB", { maximumFractionDigits: 0 })}
                </TableCell>
                <TableCell>
                  {c.gbp_per_sqft != null
                    ? `£${c.gbp_per_sqft.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`
                    : "—"}
                </TableCell>
                <TableCell>{c.bedrooms}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
