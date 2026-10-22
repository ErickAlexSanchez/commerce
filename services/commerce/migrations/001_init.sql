CREATE TABLE inventory_items (
  sku text PRIMARY KEY,
  quantity integer NOT NULL CHECK (quantity >= 0),
  version integer NOT NULL CHECK (version >= 0)
);

CREATE TABLE checkout_sessions (
  id uuid PRIMARY KEY,
  access_token_hash text NOT NULL,
  brand text NOT NULL CHECK (brand IN ('vesper', 'counsel')),
  email text NOT NULL,
  total_cents integer NOT NULL CHECK (total_cents >= 0),
  currency text NOT NULL,
  lines jsonb NOT NULL,
  slot_id uuid,
  slot_version integer,
  status text NOT NULL CHECK (status IN ('open', 'paid')),
  order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id uuid PRIMARY KEY,
  stripe_event_id text NOT NULL UNIQUE,
  checkout_session_id uuid NOT NULL REFERENCES checkout_sessions (id),
  brand text NOT NULL CHECK (brand IN ('vesper', 'counsel')),
  email text NOT NULL,
  status text NOT NULL CHECK (status = 'paid'),
  total_cents integer NOT NULL CHECK (total_cents >= 0),
  currency text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_lines (
  id uuid PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders (id),
  sku text NOT NULL,
  name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_amount_cents integer NOT NULL CHECK (unit_amount_cents >= 0),
  certificate_file_key text
);

CREATE TABLE availability_slots (
  id uuid PRIMARY KEY,
  service_slug text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('open', 'held', 'confirmed')),
  version integer NOT NULL CHECK (version >= 0),
  hold_session_id uuid,
  held_until timestamptz,
  order_id uuid,
  CHECK (ends_at > starts_at)
);

CREATE INDEX availability_slots_service_idx ON availability_slots (service_slug, starts_at);
