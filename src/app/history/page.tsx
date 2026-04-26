"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

export default function HistoryIndexPage() {
  const [outcode, setOutcode] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const oc = outcode.replace(/\s/g, "").toUpperCase();
    if (oc) router.push(`/history/${oc}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-bold">Historical Trends</h1>
      <p className="mt-1 text-muted-foreground">
        Enter an outcode to explore multi-level price trends.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 flex gap-2">
        <Input
          placeholder="e.g. SE16"
          value={outcode}
          onChange={(e) => setOutcode(e.target.value)}
          aria-label="Outcode"
        />
        <Button type="submit">Explore</Button>
      </form>
    </div>
  );
}
