CREATE TABLE IF NOT EXISTS announcements (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    title        VARCHAR(255) NOT NULL,
    content      TEXT NOT NULL,
    image_path   VARCHAR(500),
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_event_id ON announcements(event_id);
