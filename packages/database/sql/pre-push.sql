-- Extensions that must exist before drizzle-kit push/migrate.
-- The schema uses citext as a custom type; Postgres must know the type before
-- any table that references it is created.
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;
