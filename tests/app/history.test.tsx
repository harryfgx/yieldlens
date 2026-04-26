import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/history/SE16",
}));

import { HistoryClient } from "~/app/history/[outcode]/history-client";

const mockDrilldown = [
  { geo_level: "postcode_sector", geo_value: "SE16", month: "2025-01", avg_price: 400000, rolling_12m_avg: 395000, yoy_growth_pct: 2.5 },
  { geo_level: "outcode", geo_value: "SE16", month: "2025-01", avg_price: 410000, rolling_12m_avg: 405000, yoy_growth_pct: 3.1 },
  { geo_level: "area", geo_value: "SE", month: "2025-01", avg_price: 450000, rolling_12m_avg: 440000, yoy_growth_pct: 1.8 },
  { geo_level: "region", geo_value: "London", month: "2025-01", avg_price: 500000, rolling_12m_avg: 490000, yoy_growth_pct: 2.0 },
];

describe("History page", () => {
  it("renders 4 chart sections with distinct data-testid", () => {
    render(
      <HistoryClient outcode="SE16" drilldown={mockDrilldown} findings={[]} />,
    );

    expect(screen.getByTestId("chart-postcode_sector")).toBeInTheDocument();
    expect(screen.getByTestId("chart-outcode")).toBeInTheDocument();
    expect(screen.getByTestId("chart-area")).toBeInTheDocument();
    expect(screen.getByTestId("chart-region")).toBeInTheDocument();
  });

  it("renders breadcrumb with outcode", () => {
    render(
      <HistoryClient outcode="SE16" drilldown={mockDrilldown} findings={[]} />,
    );
    expect(screen.getByText("SE16")).toBeInTheDocument();
    expect(screen.getByText("Historical")).toBeInTheDocument();
  });
});
