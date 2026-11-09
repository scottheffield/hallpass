// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SessionCard } from "./SessionCard";

describe("SessionCard headingLevel", () => {
  it("defaults break titles to h2", () => {
    const html = renderToStaticMarkup(
      <SessionCard kind="break" title="Room to breathe" time="10:40" />,
    );
    expect(html).toContain("<h2");
    expect(html).not.toContain("<h3");
  });

  it("renders break titles as h3 when requested", () => {
    const html = renderToStaticMarkup(
      <SessionCard kind="break" headingLevel={3} title="Room to breathe" time="10:40" />,
    );
    expect(html).toContain("<h3");
    expect(html).not.toMatch(/<h2[\s>]/);
  });
});
