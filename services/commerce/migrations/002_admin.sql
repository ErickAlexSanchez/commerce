CREATE TABLE catalog_listings (
  sku text PRIMARY KEY,
  brand text NOT NULL CHECK (brand IN ('vesper', 'counsel')),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  price_cents integer NOT NULL CHECK (price_cents >= 0 AND price_cents <= 10000000)
);

CREATE TABLE admin_users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL
);

CREATE TABLE admin_sessions (
  token_hash text PRIMARY KEY,
  admin_user_id uuid NOT NULL REFERENCES admin_users (id),
  expires_at timestamptz NOT NULL
);

CREATE TABLE inactive_payment_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  publishable_key text NOT NULL DEFAULT '',
  secret_key text NOT NULL DEFAULT '',
  connected boolean NOT NULL DEFAULT false CHECK (connected = false),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO inactive_payment_settings (id, publishable_key, secret_key, connected)
VALUES (true, '', '', false);
