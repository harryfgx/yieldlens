"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Scale, LineChart, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { api } from "~/trpc/react";

function NovelInsightCard() {
  const { data, isLoading, isError, refetch } =
    api.analytics.novelInsight.useQuery();

  if (isLoading) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <Skeleton role="status" className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive" className="mx-auto max-w-2xl">
        <AlertCircle className="size-4" />
        <AlertTitle>Failed to load insight</AlertTitle>
        <AlertDescription className="flex items-center gap-2">
          Could not fetch the latest market insight.
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) return null;

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle className="text-lg">{data.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{data.value}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.description}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Methodology: {data.methodology}
        </p>
      </CardContent>
    </Card>
  );
}

const ctas = [
  {
    href: "/analyse",
    icon: Calculator,
    title: "Analyse a Property",
    description: "Get a composite investment score with mortgage scenarios.",
    label: "Explore",
  },
  {
    href: "/compare",
    icon: Scale,
    title: "Compare Postcodes",
    description: "Side-by-side yield, growth, and risk for up to 4 areas.",
    label: "Explore",
  },
  {
    href: "/history",
    icon: LineChart,
    title: "Historical Trends",
    description: "Multi-level price drill-down from postcode to region.",
    label: "Explore",
  },
] as const;

export default function Home() {
  const router = useRouter();
  const [postcode, setPostcode] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = postcode.trim().replace(/\s/g, "");
    if (trimmed.length < 3) return;
    const outcode = trimmed.slice(0, -3).toUpperCase();
    router.push(`/history/${outcode}`);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      {/* Hero */}
      <section className="text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Know if a London property is a good investment before you buy.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          The UK buy-to-let market has become increasingly complex for
          individual investors. Section 24 tax changes have eroded mortgage
          interest relief, minimum EPC regulations threaten older stock, and
          interest rates have risen sharply since 2022. YieldLens combines real
          HM Land Registry transactions, ONS house price and rental indices,
          police crime data, and EPC attributes into a single composite
          investment score — so you can make informed decisions backed by data,
          not guesswork.
        </p>
      </section>

      {/* Postcode search */}
      <form
        onSubmit={handleSubmit}
        className="mx-auto mt-8 flex max-w-md gap-2"
      >
        <label htmlFor="postcode-search" className="sr-only">
          Enter a London postcode
        </label>
        <Input
          id="postcode-search"
          type="text"
          placeholder="e.g. SE16 7PB"
          value={postcode}
          onChange={(e) => setPostcode(e.target.value)}
          className="flex-1"
        />
        <Button type="submit">Search</Button>
      </form>

      {/* Novel insight */}
      <section className="mt-12" aria-label="Market insight">
        <NovelInsightCard />
      </section>

      {/* CTA tiles */}
      <section className="mt-12" aria-label="Explore features">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {ctas.map((cta) => (
            <Card key={cta.href} className="flex flex-col">
              <CardHeader>
                <cta.icon className="size-8 text-primary" aria-hidden="true" />
                <CardTitle className="mt-2">{cta.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between">
                <p className="text-sm text-muted-foreground">
                  {cta.description}
                </p>
                <Button asChild variant="outline" className="mt-4 w-full">
                  <Link href={cta.href}>{cta.label} →</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
