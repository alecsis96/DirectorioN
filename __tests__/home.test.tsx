import React from "react";
import { render, screen } from "@testing-library/react";
import Home from "../pages/index";

vi.mock("next/router", () => ({
  useRouter: () => ({
    pathname: "/",
    query: {},
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("Home page", () => {
  it("renders the title", () => {
    render(<Home />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
  });
});
