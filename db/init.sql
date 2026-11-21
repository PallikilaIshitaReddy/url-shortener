CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE links (
  id BIGSERIAL PRIMARY KEY,
  short_code TEXT UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  user_id BIGINT REFERENCES users(id),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE clicks (
  id BIGSERIAL PRIMARY KEY,
  link_id BIGINT REFERENCES links(id),
  clicked_at TIMESTAMPTZ DEFAULT now(),
  referrer TEXT,
  device TEXT,
  country TEXT
);
CREATE INDEX idx_clicks_link_time ON clicks(link_id, clicked_at);

ALTER SEQUENCE links_id_seq RESTART WITH 1000000;
