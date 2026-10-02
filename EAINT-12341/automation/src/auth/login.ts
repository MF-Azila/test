import type { Page } from "@playwright/test";
import { loginURL } from "@config/environments";

/**
 * Sign a BackOffice user in on the staging portal.
 *
 *   "bo"      → BO_USERNAME / BO_PASSWORD             (approver, e.g. kmcheah)
 *   "boAdmin" → BO_ADMIN_USERNAME / BO_ADMIN_PASSWORD (assignee, e.g. eautosoyeng)
 *
 * The login form's field ids are NOT known from the handover, so the form is
 * found the way a person finds it: the visible password box, the visible text
 * box before it, and the button that says log in / sign in. If any of that
 * cannot be found, or the portal asks for something else (captcha, OTP), the
 * robot says so and WAITS for the tester to sign in by hand — it never guesses
 * further.
 *
 * Signed in = the portal home shows the onboarding menu
 * (`li.obs-auth-required`, see backoffice.page.ts).
 */
export type Role = "bo" | "boAdmin";

const CREDENTIALS: Record<Role, { user: string; pass: string; label: string }> = {
  bo: { user: "BO_USERNAME", pass: "BO_PASSWORD", label: "Approver" },
  boAdmin: { user: "BO_ADMIN_USERNAME", pass: "BO_ADMIN_PASSWORD", label: "Assignee" },
};

const SIGNED_IN = "li.obs-auth-required";

export class LoginPage {
  constructor(private readonly page: Page) {}

  async as(role: Role): Promise<void> {
    const c = CREDENTIALS[role];
    const user = (process.env[c.user] ?? "").trim();
    const pass = (process.env[c.pass] ?? "").trim();
    const gateMs = Number(process.env.GATE_MINUTES ?? 20) * 60_000;

    await this.page.goto(loginURL(), { waitUntil: "domcontentloaded" });
    if (await this.signedIn(5_000)) return;

    const auto = user && pass ? await this.tryForm(user, pass) : "no username/password in the settings file";
    if (auto === "ok" && (await this.signedIn(60_000))) {
      console.log(`  signed in as ${c.label} (${user})`);
      return;
    }

    console.log(
      `\n*** Please sign in BY HAND as the ${c.label} (${user || c.user}) in the browser window. ***\n` +
        `    Reason: ${auto === "ok" ? "the portal home did not appear after logging in" : auto}.\n` +
        `    Waiting up to ${Math.round(gateMs / 60_000)} minutes; the robot continues by itself.\n`,
    );
    if (!(await this.signedIn(gateMs))) {
      throw new Error(`${c.label} was not signed in: the portal home menu (${SIGNED_IN}) never appeared.`);
    }
    console.log(`  signed in as ${c.label} (by hand)`);
  }

  private async signedIn(timeout: number): Promise<boolean> {
    return this.page
      .locator(SIGNED_IN)
      .first()
      .waitFor({ state: "attached", timeout })
      .then(() => true)
      .catch(() => false);
  }

  /** Returns "ok" when the form was filled and sent, or why it was not. */
  private async tryForm(user: string, pass: string): Promise<string> {
    const password = this.page.locator("input[type=password]:visible").first();
    if (!(await password.count().catch(() => 0))) return "no password box on the login page";
    // The username box: the last visible text/email input BEFORE the password box.
    const username = this.page
      .locator("input[type=text]:visible, input[type=email]:visible, input:not([type]):visible")
      .filter({ hasNot: this.page.locator("[readonly]") });
    if (!(await username.count().catch(() => 0))) return "no username box on the login page";
    if (await this.page.locator("iframe[src*=recaptcha]:visible, .g-recaptcha:visible").count().catch(() => 0)) {
      return "the login page has a reCAPTCHA";
    }
    await username.first().fill(user);
    await password.fill(pass);
    const button = this.page
      .getByRole("button", { name: /^(log ?in|sign ?in|submit|masuk)$/i })
      .or(this.page.locator("input[type=submit]:visible, button[type=submit]:visible"))
      .first();
    if (await button.count().catch(() => 0)) await button.click();
    else await password.press("Enter");
    return "ok";
  }
}
