/**
 * Load the settings file the same way playwright.config.ts does:
 * ENV_FILE, else env/.<TEST_ENV>.env-local, else env/env-default.
 */
import { config as loadEnv } from "dotenv";
import * as fs from "node:fs";
import * as path from "node:path";

export function loadSettings(): string {
  const testEnv = process.env.TEST_ENV || "staging";
  const local = path.join(__dirname, "..", "env", `.${testEnv}.env-local`);
  const file = process.env.ENV_FILE || (fs.existsSync(local) ? local : path.join(__dirname, "..", "env", "env-default"));
  loadEnv({ path: file, override: true });
  return file;
}
