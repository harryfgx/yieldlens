import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/40 py-8">
      <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground">
        <p>
          Contains public sector information licensed under the{" "}
          <a
            href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Open Government Licence v3.0
          </a>
        </p>
        <div className="mt-3 flex items-center justify-center gap-4">
          <a
            href="https://github.com/harryfgx/yieldlens"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            GitHub
          </a>
          <Link
            href="/about"
            className="underline hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            About the Data
          </Link>
          <a
            href="https://opensource.org/licenses/MIT"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            MIT Licence
          </a>
        </div>
      </div>
    </footer>
  );
}
