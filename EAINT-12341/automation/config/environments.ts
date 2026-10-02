/**
 * Where staging lives. Every value is read lazily (inside a function), so
 * playwright.config.ts can import this before the env file is loaded.
 *
 * Values given by the QA (Azila, 02.10.2026):
 *   staging login   https://staging.eauto.my/uat4/public/login/
 *   Pre-Application https://staging.eauto.my/obs/preOnb/recaptcha → /obs/preOnb/form
 *   eSim            https://172.30.202.114:9089/esim/login
 */
const DEFAULTS = {
  BASE_URL: "https://staging.eauto.my",
  LOGIN_URL: "https://staging.eauto.my/uat4/public/login/",
  ESIM_URL: "https://172.30.202.114:9089/esim",
};

function env(name: keyof typeof DEFAULTS): string {
  return (process.env[name] || DEFAULTS[name]).trim();
}

/** Site root, no trailing slash. */
export function baseURL(): string {
  return env("BASE_URL").replace(/\/+$/, "");
}

/** An `/obs/` page, e.g. obsURL("obs/preOnb/form"). */
export function obsURL(path: string): string {
  return `${baseURL()}/${path.replace(/^\/+/, "")}`;
}

/** The staging portal login page (BackOffice users sign in here). */
export function loginURL(): string {
  return env("LOGIN_URL");
}

/** eSim root, no trailing slash — the UI is at `${esimURL()}/login`. */
export function esimURL(): string {
  return env("ESIM_URL").replace(/\/+$/, "").replace(/\/login$/, "");
}
