import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { dataSources } from "~/config/data-sources";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold">About the Data</h1>

      {/* Data Sources */}
      <section className="mt-8">
        <h2 className="text-2xl font-semibold">Data Sources</h2>
        <div className="mt-4 grid gap-4">
          {dataSources.map((ds) => (
            <Card key={ds.name}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  <a
                    href={ds.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {ds.name}
                  </a>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>{ds.description}</p>
                <p className="text-muted-foreground">
                  Licence: {ds.licence} · Volume: {ds.volume}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Methodology */}
      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Methodology</h2>
        <p className="mt-3 text-muted-foreground">
          YieldLens computes a composite investment score (0–100) using four
          weighted dimensions aligned to Loshin&apos;s BI Spectrum (S11):
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-muted-foreground">
          <li>
            <strong>Yield (35%)</strong> — gross rental yield percentile across
            London outcodes (Descriptive + Statistical)
          </li>
          <li>
            <strong>Capital Growth (25%)</strong> — year-on-year house price
            growth percentile (Descriptive + Predictive)
          </li>
          <li>
            <strong>Risk (20%)</strong> — inverse crime rate index and price
            volatility (Diagnostic)
          </li>
          <li>
            <strong>Cashflow (20%)</strong> — net monthly cashflow after
            mortgage, management, and void costs (Descriptive Classification)
          </li>
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">
          Each dimension is ranked into quartiles (NTILE 4) across all London
          outcodes. The weighted sum classifies properties as{" "}
          <strong>Unicorn</strong> (top yield + growth), <strong>Cash Cow</strong>{" "}
          (high yield), <strong>Growth Play</strong> (high growth), or{" "}
          <strong>Avoid</strong>.
        </p>
      </section>

      {/* Known Limitations */}
      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Known Limitations</h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-muted-foreground">
          <li>
            Land Registry data has a 1–3 month publication lag; the most recent
            transactions may not yet be reflected.
          </li>
          <li>
            Rental yield estimates use ONS regional indices rather than
            property-level rents, which may over- or under-estimate at the
            postcode level.
          </li>
          <li>
            Crime data is aggregated to LSOA level and may not reflect
            street-level variation within a postcode.
          </li>
          <li>
            EPC enrichment is optional and depends on API key availability;
            properties without EPC data use defaults for floor area.
          </li>
          <li>
            The composite score is a decision-support tool, not financial
            advice. Users should conduct independent due diligence.
          </li>
        </ul>
      </section>

      {/* Licence */}
      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Licence</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          The YieldLens application is released under the{" "}
          <a
            href="https://opensource.org/licenses/MIT"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            MIT Licence
          </a>
          . All government data is used under the{" "}
          <a
            href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            Open Government Licence v3.0
          </a>
          .
        </p>
      </section>
    </div>
  );
}
