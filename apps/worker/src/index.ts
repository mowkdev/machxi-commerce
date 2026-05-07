// `./env` MUST be imported first: it loads .env via dotenv side effects before
// any module touches `process.env` (notably @repo/database/client, which
// validates DATABASE_URL at import time).
import "./env.js";

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { NativeConnection, Worker } from "@temporalio/worker";
import * as activities from "./activities/checkout.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workflowsPath = join(__dirname, "workflows");

async function main() {
  const address = process.env.TEMPORAL_ADDRESS ?? "127.0.0.1:7233";
  const connection = await NativeConnection.connect({ address });
  const worker = await Worker.create({
    workflowsPath,
    activities,
    taskQueue: "commerce",
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE ?? "default",
  });
  await worker.run();
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
