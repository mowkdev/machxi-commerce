import type { Principal } from '@repo/types';

export type AppVariables = {
  principal?: Principal;
};

export type AppEnv = {
  Variables: AppVariables;
};
