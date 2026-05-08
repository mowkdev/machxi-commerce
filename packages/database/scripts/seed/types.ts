/**
 * Shared type aliases for the demo-seed modules.
 *
 * The `db` symbol is loaded lazily in the entrypoint (after dotenv runs),
 * so callees take it as a parameter and use this alias for the type.
 */

export type Db = Awaited<typeof import('../../src/client')>['db'];

export interface OptionCatalog {
  colorOptionId: string;
  sizeOptionId: string;
  colorValueIds: Map<string, string>;
  sizeValueIds: Map<string, string>;
}
