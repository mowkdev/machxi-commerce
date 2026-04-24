import type { Principal } from '@repo/types';
import type { Logger } from './lib/logger';

export type AppVariables = {
  logger: Logger;
  requestId: string;
  principal?: Principal;
};

export type AppEnv = {
  Variables: AppVariables;
};
