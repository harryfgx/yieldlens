import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/navigation
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/",
}));

// Mock tRPC
const novelInsightMock = {
  data: undefined as
    | {
        title: string;
        description: string;
        value: string;
        methodology: string;
      }
    | undefined,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
};

vi.mock("~/trpc/react", () => ({
  api: {
    analytics: {
      novelInsight: {
        useQuery: () => novelInsightMock,
      },
    },
  },
}));

// Must import after mocks
import Home from "~/app/page";

describe("Home page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    novelInsightMock.data = undefined;
    novelInsightMock.isLoading = false;
    novelInsightMock.isError = false;
  });

  it("renders EXACT hero tagline", () => {
    render(<Home />);
    expect(
      screen.getByText(
        "Know if a London property is a good investment before you buy.",
      ),
    ).toBeInTheDocument();
  });

  it("shows Skeleton while novelInsight loading", () => {
    novelInsightMock.isLoading = true;
    render(<Home />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows insight title when novelInsight resolves", () => {
    novelInsightMock.data = {
      title: "Crime Premium Analysis",
      description: "Low-crime outcodes command higher prices",
      value: "£42,000 median premium",
      methodology: "quartile comparison",
    };
    render(<Home />);
    expect(screen.getByText("Crime Premium Analysis")).toBeInTheDocument();
  });

  it("renders 3 CTA links with correct hrefs", () => {
    render(<Home />);
    const links = screen.getAllByRole("link", { name: /Explore/ });
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAttribute("href", "/analyse");
    expect(links[1]).toHaveAttribute("href", "/compare");
    expect(links[2]).toHaveAttribute("href", "/history");
  });

  it("navigates to /history/SE16 on valid postcode submit", async () => {
    const { default: userEvent } = await import(
      "@testing-library/user-event"
    );
    const user = userEvent.setup();
    render(<Home />);
    const input = screen.getByPlaceholderText("e.g. SE16 7PB");
    const button = screen.getByRole("button", { name: "Search" });
    await user.type(input, "SE16 7PB");
    await user.click(button);
    expect(pushMock).toHaveBeenCalledWith("/history/SE16");
  });
});
