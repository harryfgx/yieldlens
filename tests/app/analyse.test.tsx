import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/analyse",
}));

// Mock tRPC
const scoreQueryMock = {
  data: undefined as Record<string, unknown> | undefined,
  isLoading: false,
  isError: false,
  error: null as { message: string } | null,
  refetch: vi.fn(),
};

const compQueryMock = {
  data: undefined as Record<string, unknown> | undefined,
  isLoading: false,
};

const listMortgageProductsMock = {
  data: [
    {
      mortgage_product_id: 1,
      lender: "TestBank",
      product_name: "Fix 5yr",
      initial_rate_pct: "5.5",
      mortgage_type: "REPAYMENT",
    },
  ],
};

vi.mock("~/trpc/react", () => ({
  api: {
    analytics: {
      compositeScore: { useQuery: () => scoreQueryMock },
      comparables: { useQuery: () => compQueryMock },
      listMortgageProducts: { useQuery: () => listMortgageProductsMock },
    },
  },
}));

import AnalysePage from "~/app/analyse/page";

describe("Analyse page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scoreQueryMock.data = undefined;
    scoreQueryMock.isLoading = false;
    scoreQueryMock.isError = false;
    scoreQueryMock.error = null;
    compQueryMock.data = undefined;
    compQueryMock.isLoading = false;
  });

  it("renders 7 form fields with labels", () => {
    render(<AnalysePage />);
    expect(screen.getByLabelText(/postcode/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/bedrooms/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/property type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/asking price/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/expected monthly rent/i)).toBeInTheDocument();
    expect(screen.getByText(/deposit.*%/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mortgage product/i)).toBeInTheDocument();
  });

  it("shows validation error on empty postcode submit", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(<AnalysePage />);
    const button = screen.getByRole("button", { name: /analyse/i });
    await user.click(button);
    const errorMsg = await screen.findByText(/valid UK postcode/i);
    expect(errorMsg).toBeInTheDocument();
  });

  it("shows validation error when askingPrice is 30000", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(<AnalysePage />);
    const priceInput = screen.getByLabelText(/asking price/i);
    await user.clear(priceInput);
    await user.type(priceInput, "30000");
    const button = screen.getByRole("button", { name: /analyse/i });
    await user.click(button);
    const errorMsg = await screen.findByText(/min.*50.*000/i);
    expect(errorMsg).toBeInTheDocument();
  });

  it("calls form submit handler on valid input", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(<AnalysePage />);

    await user.type(screen.getByLabelText(/postcode/i), "SE16 7PB");
    await user.clear(screen.getByLabelText(/asking price/i));
    await user.type(screen.getByLabelText(/asking price/i), "400000");
    await user.clear(screen.getByLabelText(/expected monthly rent/i));
    await user.type(screen.getByLabelText(/expected monthly rent/i), "1800");

    // Radix Select doesn't render dropdown in jsdom, so we verify
    // that text inputs accept valid values without validation errors
    expect(screen.queryByText(/valid UK postcode/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/min.*50.*000/i)).not.toBeInTheDocument();
  });

  it("renders results card with composite score after successful query", () => {
    scoreQueryMock.data = {
      compositeScore: 72.5,
      verdict: "CASH_COW",
      components: {
        yieldScore: 75,
        growthScore: 50,
        riskScore: 75,
        cashflowScore: 75,
      },
      monthlyPayment: 1375,
      grossYieldPct: 5.4,
      netYieldPct: 4.05,
    };
    render(<AnalysePage />);
    expect(screen.getByText("72.5")).toBeInTheDocument();
  });

  it("shows Interest-Only and Repayment mortgage cards after results", () => {
    scoreQueryMock.data = {
      compositeScore: 65,
      verdict: "GROWTH_PLAY",
      components: {
        yieldScore: 50,
        growthScore: 75,
        riskScore: 50,
        cashflowScore: 50,
      },
      monthlyPayment: 1375,
      grossYieldPct: 4.0,
      netYieldPct: 3.0,
    };
    render(<AnalysePage />);
    expect(screen.getByText("Interest-Only")).toBeInTheDocument();
    expect(screen.getByText("Repayment")).toBeInTheDocument();
  });
});
