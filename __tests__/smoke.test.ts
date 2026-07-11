import { describe, it, expect } from "vitest";

describe("Test Infrastructure Smoke Test", () => {
  it("verifies basic arithmetic works", () => {
    expect(1 + 1).toBe(2);
  });

  it("verifies vitest globals are configured", () => {
    expect(true).toBeTruthy();
  });

  it("verifies jest-dom matchers are available", () => {
    const element = document.createElement("div");
    element.textContent = "Hello";
    document.body.appendChild(element);

    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent("Hello");

    document.body.removeChild(element);
  });
});
