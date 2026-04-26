import { describe, it, expect, vi } from "vitest";

describe("env smoke test", () => {
  it("parses env successfully with required keys", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/db");
    vi.stubEnv("DIRECT_URL", "postgresql://user:pass@localhost:5432/db");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "a".repeat(20));
    vi.stubEnv("SUPABASE_PROJECT_REF", "scuggrmjkrrvciblekjj");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "b".repeat(20));
    vi.stubEnv("SKIP_ENV_VALIDATION", "");

    const { env } = await import("~/env.js");

    // Client-side vars are accessible in test environment
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe(
      "https://example.supabase.co",
    );
    expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("b".repeat(20));

    vi.unstubAllEnvs();
  });
});
