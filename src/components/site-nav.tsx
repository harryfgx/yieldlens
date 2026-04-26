"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

const mainLinks = [
  { href: "/", label: "Home" },
  { href: "/analyse", label: "Analyse" },
  { href: "/compare", label: "Compare" },
  { href: "/history", label: "History" },
] as const;

const insightLinks = [
  { href: "/insights/quadrant", label: "Quadrant Map" },
  { href: "/insights/crime-map", label: "Crime Map" },
] as const;

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);

  const isInsightsActive = pathname.startsWith("/insights");

  return (
    <nav aria-label="Main navigation" className="border-b bg-background">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold">
          YieldLens
        </Link>

        {/* Desktop */}
        <ul className="hidden items-center gap-1 md:flex">
          {mainLinks.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  pathname === l.href
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {l.label}
              </Link>
            </li>
          ))}
          {/* Insights dropdown */}
          <li className="relative">
            <button
              onClick={() => setInsightsOpen(!insightsOpen)}
              onBlur={() => setTimeout(() => setInsightsOpen(false), 150)}
              className={cn(
                "flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isInsightsActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
              aria-expanded={insightsOpen}
              aria-haspopup="true"
            >
              Insights
              <ChevronDown className="size-3" aria-hidden="true" />
            </button>
            {insightsOpen && (
              <ul className="absolute left-0 top-full z-50 mt-1 w-44 rounded-md border bg-background py-1 shadow-md">
                {insightLinks.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      onClick={() => setInsightsOpen(false)}
                      className={cn(
                        "block px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        pathname === l.href
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
          <li>
            <Link
              href="/about"
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                pathname === "/about"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              About
            </Link>
          </li>
        </ul>

        {/* Mobile toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>

      {/* Mobile menu */}
      {open && (
        <ul className="border-t px-4 pb-3 md:hidden">
          {mainLinks.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  pathname === l.href
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {l.label}
              </Link>
            </li>
          ))}
          {insightLinks.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  pathname === l.href
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {l.label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/about"
              onClick={() => setOpen(false)}
              className={cn(
                "block rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                pathname === "/about"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              About
            </Link>
          </li>
        </ul>
      )}
    </nav>
  );
}
