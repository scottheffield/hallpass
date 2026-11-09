import { describe, expect, it } from "vitest";
import { shellChromeForPlace } from "./shellChrome";

describe("shellChromeForPlace", () => {
  it("keeps Ask mounted when the ask sheet is open", () => {
    const chrome = shellChromeForPlace("today", true);
    expect(chrome.showAsk).toBe(true);
    expect(chrome.showTabs).toBe(false);
  });

  it("hides tabs and Ask during intake", () => {
    const chrome = shellChromeForPlace("entry", false);
    expect(chrome.showAsk).toBe(false);
    expect(chrome.showTabs).toBe(false);
  });

  it("shows tabs and Ask on auxiliary screens when no sheet is open", () => {
    const chrome = shellChromeForPlace("readout", false);
    expect(chrome.showAsk).toBe(true);
    expect(chrome.showTabs).toBe(true);
  });
});
