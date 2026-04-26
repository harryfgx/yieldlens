import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/insights/quadrant",
}));

const quadrantMock = {
  data: undefined as
    | {
        outcode: string;
        avg_yield_pct: number;
        yoy_price_growth_pct: number;
        yield_quartile: number;
        growth_quartile: number;
        quadrant: string;
      }[]
    | undefined,
  isLoading: false,
  isError: false,
  error: null as { message: string } | null,
};

vi.mock("~/trpc/react", () => ({
  api: {
    analytics: {
      quadrant: {
        useQuery: () => quadrantMock,
      },
    },
  },
}));

import QuadrantPage from "~/app/insights/quadrant/page";

describe("Quadrant chart", () => {
  it("renders 4 quadrant backgrounds", () => {
    quadrantMock.data = [
      { outcode: "SE16", avg_yield_pct: 4.5, yoy_price_growth_pct: 2.1, yield_quartile: 3, growth_quartile: 2, quadrant: "CASH_COW" },
      { outcode: "E1", avg_yield_pct: 3.2, yoy_price_growth_pct: 5.0, yield_quartile: 2, growth_quartile: 4, quadrant: "GROWTH_PLAY" },
    ];
    render(<QuadrantPage />);
    expect(screen.getByTestId("bg-UNICORN")).toBeInTheDocument();
    expect(screen.getByTestId("bg-CASH_COW")).toBeInTheDocument();
    expect(screen.getByTestId("bg-GROWTH_PLAY")).toBeInTheDocument();
    expect(screen.getByTestId("bg-AVOID")).toBeInTheDocument();
  });

  it("plots dots for data", () => {
    quadrantMock.data = [
      { outcode: "SE16", avg_yield_pct: 4.5, yoy_price_growth_pct: 2.1, yield_quartile: 3, growth_quartile: 2, quadrant: "CASH_COW" },
      { outcode: "E1", avg_yield_pct: 3.2, yoy_price_growth_pct: 5.0, yield_quartile: 2, growth_quartile: 4, quadrant: "GROWTH_PLAY" },
      { outcode: "SW1", avg_yield_pct: 5.0, yoy_price_growth_pct: 6.0, yield_quartile: 4, growth_quartile: 4, quadrant: "UNICORN" },
    ];
    render(<QuadrantPage />);
    const dots = screen.getAllByTestId("quadrant-dot");
    expect(dots.length).toBe(3);
  });

  it("shows outcode on hover via tooltip span", () => {
    quadrantMock.data = [
      { outcode: "SE16", avg_yield_pct: 4.5, yoy_price_growth_pct: 2.1, yield_quartile: 3, growth_quartile: 2, quadrant: "CASH_COW" },
    ];
    render(<QuadrantPage />);
    // The outcode text exists in the DOM (hidden until hover)
    expect(screen.getByText("SE16")).toBeInTheDocument();
  });
});
