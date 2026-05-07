// MUST be imported before any module that touches @repo/database/client
// (which validates DATABASE_URL at module init). ES imports are evaluated in
// order, so this file's side effects run before transitive db imports resolve.
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env deterministically, regardless of cwd. Local `.env` wins (dotenv
// does not overwrite existing vars), with root `.env` as fallback for shared
// values like DATABASE_URL.
loadEnv({ path: resolve(__dirname, "../.env") });
loadEnv({ path: resolve(__dirname, "../../../.env") });
