CREATE TABLE IF NOT EXISTS entries (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id         UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    band_id          UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
    status           entry_status NOT NULL DEFAULT 'pending',
    message          TEXT,
    rejection_reason TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, band_id)
);

CREATE INDEX IF NOT EXISTS idx_entries_event_id ON entries(event_id);
CREATE INDEX IF NOT EXISTS idx_entries_band_id ON entries(band_id);
CREATE INDEX IF NOT EXISTS idx_entries_status ON entries(status);
