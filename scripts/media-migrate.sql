BEGIN;
ALTER TABLE media DROP COLUMN IF EXISTS file_type;
ALTER TABLE media DROP COLUMN IF EXISTS metadata;

ALTER TABLE media ADD COLUMN storage_key text;
ALTER TABLE media ADD COLUMN thumbnail_key text;
ALTER TABLE media ADD COLUMN thumbnail_url text;
ALTER TABLE media ADD COLUMN file_name text;
ALTER TABLE media ADD COLUMN mime_type varchar(127);
ALTER TABLE media ADD COLUMN size_bytes bigint;
ALTER TABLE media ADD COLUMN width integer;
ALTER TABLE media ADD COLUMN height integer;
ALTER TABLE media ADD COLUMN checksum_sha256 varchar(64);
ALTER TABLE media ADD COLUMN title text;
ALTER TABLE media ADD COLUMN alt_text text;
ALTER TABLE media ADD COLUMN caption text;
ALTER TABLE media ADD COLUMN description text;
ALTER TABLE media ADD COLUMN metadata jsonb;
ALTER TABLE media ADD COLUMN deleted_at timestamptz;

ALTER TABLE media ALTER COLUMN storage_key SET NOT NULL;
ALTER TABLE media ALTER COLUMN file_name SET NOT NULL;
ALTER TABLE media ALTER COLUMN mime_type SET NOT NULL;
ALTER TABLE media ALTER COLUMN size_bytes SET NOT NULL;
ALTER TABLE media ALTER COLUMN checksum_sha256 SET NOT NULL;

CREATE UNIQUE INDEX uk_media_storage_key ON media (storage_key);
CREATE INDEX idx_media_checksum ON media (checksum_sha256);
CREATE INDEX idx_media_created_at ON media (created_at);
CREATE INDEX idx_media_mime_type ON media (mime_type);
CREATE INDEX idx_media_deleted_at ON media (deleted_at);
COMMIT;
