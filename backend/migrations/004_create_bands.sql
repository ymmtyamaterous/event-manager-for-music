CREATE TABLE IF NOT EXISTS bands (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name               VARCHAR(255) NOT NULL,
    profile_image_path VARCHAR(500),
    genre              VARCHAR(100),
    formed_year        SMALLINT,
    description        TEXT,
    twitter_url        VARCHAR(500),
    instagram_url      VARCHAR(500),
    facebook_url       VARCHAR(500),
    youtube_url        VARCHAR(500),
    website_url        VARCHAR(500),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bands_owner_id ON bands(owner_id);
