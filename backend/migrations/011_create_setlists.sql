CREATE TABLE IF NOT EXISTS setlists (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    band_id       UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
    title         VARCHAR(255) NOT NULL,
    artist        VARCHAR(255),
    display_order SMALLINT NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_setlists_band_id ON setlists(band_id);
