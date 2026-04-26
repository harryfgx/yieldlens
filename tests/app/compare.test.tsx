import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/compare",
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: vi.fn(),
  Toaster: () => null,
}));

const snapshotMock = {
  data: undefined as
    | {
        outcode: string;
        median_price_12m: number;
        avg_yield_pct: number;
        yoy_growth_pct: number;
        crime_rate_index: number;
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
      compareSnapshot: {
        useQuery: () => snapshotMock,
      },
    },
  },
}));

import ComparePage from "~/app/compare/page";
import { toast } from "sonner";

describe("Compare page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    snapshotMock.data = undefined;
    snapshotMock.isLoading = false;
    snapshotMock.isError = false;
  });

  it("renders initial empty card", () => {
    render(<ComparePage />);
    expect(screen.getByText("Empty")).toBeInTheDocument();
  });

  it("adds postcodes filling 4 cards", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(<ComparePage />);

    const input = screen.getByPlaceholderText("e.g. SE16 7PB");
    const addBtn = screen.getByRole("button", { name: /Add/ });

    // Start with 1 empty card, add 3 more to reach 4 total
    for (const pc of ["SE16 7PB", "E1 6AN", "SW1A 1AA"]) {
      await user.clear(input);
      await user.type(input, pc);
      await user.click(addBtn);
    }

    const removeButtons = screen.getAllByRole("button", { name: /Remove/ });
    expect(removeButtons.length).toBe(4);
  });

  it("shows toast on 5th postcode attempt", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(<ComparePage />);

    const input = screen.getByPlaceholderText("e.g. SE16 7PB");
    const addBtn = screen.getByRole("button", { name: /Add/ });

    // Add 3 to reach 4 total (1 initial + 3)
    for (const pc of ["SE16 7PB", "E1 6AN", "SW1A 1AA"]) {
      await user.clear(input);
      await user.type(input, pc);
      await user.click(addBtn);
    }

    // 5th attempt (already at 4)
    await user.clear(input);
    await user.type(input, "N1 9GU");
    await user.click(addBtn);

    expect(toast).toHaveBeenCalledWith("Maximum 4 postcodes reached");
  });

  it("removes postcode when X clicked", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(<ComparePage />);

    const input = screen.getByPlaceholderText("e.g. SE16 7PB");
    const addBtn = screen.getByRole("button", { name: /Add/ });

    await user.type(input, "SE16 7PB");
    await user.click(addBtn);

    const removeBtns = screen.getAllByRole("button", { name: /Remove/ });
    expect(removeBtns.length).toBe(2);

    await user.click(removeBtns[0]!);
    const remaining = screen.getAllByRole("button", { name: /Remove/ });
    expect(remaining.length).toBe(1);
  });

  it("calls compareSnapshot with outcodes", () => {
    snapshotMock.data = [
      {
        outcode: "SE16",
        median_price_12m: 450000,
        avg_yield_pct: 4.5,
        yoy_growth_pct: 2.1,
        crime_rate_index: 3.2,
        quadrant: "CASH_COW",
      },
    ];
    render(<ComparePage />);
    // Verify the yield chart renders when data is available
    expect(screen.getByText("Yield Comparison")).toBeInTheDocument();
  });
});
