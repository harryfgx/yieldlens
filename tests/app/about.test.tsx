import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/about",
}));

import AboutPage from "~/app/about/page";

describe("About page", () => {
  it("renders 7 data source entries", () => {
    render(<AboutPage />);
    const cards = screen.getAllByRole("link", {
      name: /Land Registry|ONS|police|EPC|Postcode|Mortgage/i,
    });
    expect(cards.length).toBe(7);
  });

  it("shows OGL v3.0 text for government sources", () => {
    render(<AboutPage />);
    const ogl = screen.getAllByText(/Open Government Licence v3\.0/);
    expect(ogl.length).toBeGreaterThanOrEqual(1);
  });

  it("has Methodology heading", () => {
    render(<AboutPage />);
    expect(
      screen.getByRole("heading", { name: "Methodology" }),
    ).toBeInTheDocument();
  });

  it("lists at least 3 limitation items", () => {
    render(<AboutPage />);
    const section = screen.getByRole("heading", {
      name: "Known Limitations",
    });
    const list = section.parentElement?.querySelector("ul");
    expect(list).toBeTruthy();
    const items = list?.querySelectorAll("li") ?? [];
    expect(items.length).toBeGreaterThanOrEqual(3);
  });
});
