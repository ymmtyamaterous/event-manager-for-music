CREATE TABLE IF NOT EXISTS events (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title             VARCHAR(255) NOT NULL,
    description       TEXT,
    flyer_image_path  VARCHAR(500),
    venue_name        VARCHAR(255) NOT NULL,
    venue_address     VARCHAR(500) NOT NULL,
    event_date        DATE NOT NULL,
    doors_open_time   TIME NOT NULL,
    start_time        TIME NOT NULL,
    end_time          TIME,
    ticket_price      INTEGER,
    capacity          INTEGER,
    reservation_start TIMESTAMPTZ,
    reservation_end   TIMESTAMPTZ,
    twitter_url       VARCHAR(500),
    instagram_url     VARCHAR(500),
    facebook_url      VARCHAR(500),
    other_url         VARCHAR(500),
    status            event_status NOT NULL DEFAULT 'draft',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
