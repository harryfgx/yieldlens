import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { SiteNav } from "~/components/site-nav";
import { SiteFooter } from "~/components/site-footer";
import { Toaster } from "~/components/ui/sonner";

export const metadata: Metadata = {
  title: "YieldLens — London BTL Investment Analysis",
  description:
    "Know if a London property is a good investment before you buy. Composite scoring, comparables, mortgage scenarios, and historical drill-down for every London postcode.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body className="flex min-h-screen flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:ring-2 focus:ring-ring"
        >
          Skip to content
        </a>
        <TRPCReactProvider>
          <SiteNav />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <SiteFooter />
          <Toaster />
        </TRPCReactProvider>
      </body>
    </html>
  );
}
