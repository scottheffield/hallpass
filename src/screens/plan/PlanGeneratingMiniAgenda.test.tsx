// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PlanGeneratingMiniAgenda } from "./PlanGeneratingMiniAgenda";

describe("PlanGeneratingMiniAgenda", () => {
  it("renders three decorative placeholder cards", () => {
    const html = renderToStaticMarkup(<PlanGeneratingMiniAgenda />);
    expect(html).toContain('aria-hidden="true"');
    expect(html.match(/class="[^"]*card/g)?.length).toBe(3);
    expect(html).toContain("9:30");
    expect(html).toContain("11:15");
    expect(html).toContain("2:00");
  });
});
