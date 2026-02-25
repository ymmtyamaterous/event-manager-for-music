CREATE TABLE IF NOT EXISTS reservations (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id           UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reservation_number VARCHAR(50) NOT NULL UNIQUE,
    status             reservation_status NOT NULL DEFAULT 'reserved',
    reserved_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_at       TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservations_event_id ON reservations(event_id);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_active
    ON reservations(event_id, user_id)
    WHERE status = 'reserved';
