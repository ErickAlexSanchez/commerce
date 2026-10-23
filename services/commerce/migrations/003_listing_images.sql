ALTER TABLE catalog_listings
  ADD COLUMN image_bytes bytea,
  ADD COLUMN image_content_type text,
  ADD COLUMN image_updated_at timestamptz;

ALTER TABLE catalog_listings
  ADD CONSTRAINT catalog_listings_image_type_check
  CHECK (
    image_content_type IS NULL
    OR image_content_type IN ('image/jpeg', 'image/png', 'image/webp')
  );

ALTER TABLE catalog_listings
  ADD CONSTRAINT catalog_listings_image_pair_check
  CHECK (
    (image_bytes IS NULL AND image_content_type IS NULL)
    OR (image_bytes IS NOT NULL AND image_content_type IS NOT NULL)
  );
