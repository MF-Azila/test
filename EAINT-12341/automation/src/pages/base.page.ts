import type { Locator, Page } from "@playwright/test";

/**
 * What every page object shares. REBUILT 02.10.2026 (not in the handover):
 * only what the existing page objects call — the page, and a visible-or-say-
 * what-is-missing wait.
 */
export class BasePage {
  constructor(protected readonly page: Page) {}

  /** Wait for `locator` to be visible and return it, or fail naming `what`. */
  async requireVisible(locator: Locator, what: string, timeout = 30_000): Promise<Locator> {
    await locator
      .first()
      .waitFor({ state: "visible", timeout })
      .catch(() => {
        throw new Error(`Not on screen after ${Math.round(timeout / 1000)}s: ${what} (${this.page.url()}).`);
      });
    return locator.first();
  }
}
