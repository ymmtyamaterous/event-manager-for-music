CREATE TABLE IF NOT EXISTS performances (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id          UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    band_id           UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
    start_time        TIME,
    end_time          TIME,
    performance_order SMALLINT NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, band_id)
);

CREATE INDEX IF NOT EXISTS idx_performances_event_id ON performances(event_id);
CREATE INDEX IF NOT EXISTS idx_performances_band_id ON performances(band_id);
