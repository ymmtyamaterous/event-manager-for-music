CREATE TABLE IF NOT EXISTS band_members (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    band_id       UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
    name          VARCHAR(100) NOT NULL,
    part          VARCHAR(100) NOT NULL,
    display_order SMALLINT NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_band_members_band_id ON band_members(band_id);
