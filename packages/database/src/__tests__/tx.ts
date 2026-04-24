import { Client } from 'pg';

// Run `fn` inside a transaction and always roll back. Keeps the dev DB clean.
// Each call opens and closes its own connection so failing tests don't poison
// shared state. For correctness-of-constraints tests, rollback is sufficient —
// we only need to observe whether the DB accepted or rejected each statement.
export async function withTx<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query('BEGIN');
  try {
    return await fn(client);
  } finally {
    // A failed statement aborts the transaction; rollback may itself warn but
    // never throws on an already-aborted transaction.
    await client.query('ROLLBACK').catch(() => undefined);
    await client.end();
  }
}
