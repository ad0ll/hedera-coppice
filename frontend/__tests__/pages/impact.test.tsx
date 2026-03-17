// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ImpactPage from "@/app/impact/page";

describe("Impact Page", () => {
  it("renders the page title", () => {
    render(<ImpactPage />);
    expect(screen.getByText("Environmental Impact")).toBeInTheDocument();
  });

  it("displays key impact metrics", () => {
    render(<ImpactPage />);
    expect(screen.getByText("tCO\u2082e Avoided")).toBeInTheDocument();
    expect(screen.getByText("Clean Energy Generated")).toBeInTheDocument();
    expect(screen.getByText("Projects Funded")).toBeInTheDocument();
  });

  it("shows ICMA alignment section", () => {
    render(<ImpactPage />);
    expect(screen.getByText("ICMA Green Bond Principles")).toBeInTheDocument();
  });

  it("shows Guardian integration note", () => {
    render(<ImpactPage />);
    expect(screen.getByText(/Hedera Guardian/i)).toBeInTheDocument();
  });

  it("shows project portfolio", () => {
    render(<ImpactPage />);
    expect(screen.getByText("Sunridge Solar Farm")).toBeInTheDocument();
    expect(screen.getByText("Baltic Wind Park")).toBeInTheDocument();
  });
});
