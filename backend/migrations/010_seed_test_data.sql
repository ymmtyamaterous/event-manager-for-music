INSERT INTO users (id, email, password_hash, first_name, last_name, display_name, user_type)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'seed-admin@example.com', '$2a$10$seed-admin-hash', 'Seed', 'Admin', 'Seed Admin', 'admin'),
  ('00000000-0000-0000-0000-000000000002', 'seed-organizer@example.com', '$2a$10$seed-organizer-hash', 'Seed', 'Organizer', 'Seed Organizer', 'organizer'),
  ('00000000-0000-0000-0000-000000000003', 'seed-performer@example.com', '$2a$10$seed-performer-hash', 'Seed', 'Performer', 'Seed Performer', 'performer'),
  ('00000000-0000-0000-0000-000000000004', 'seed-audience@example.com', '$2a$10$seed-audience-hash', 'Seed', 'Audience', 'Seed Audience', 'audience')
ON CONFLICT (id) DO NOTHING;

INSERT INTO bands (id, owner_id, name, genre, description)
VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000003', 'Seed Echoes', 'Rock', 'デバッグ用のテストバンド')
ON CONFLICT (id) DO NOTHING;

INSERT INTO band_members (id, band_id, name, part, display_order)
VALUES
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000010', 'Seed Vocal', 'Vocal', 1),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000010', 'Seed Guitar', 'Guitar', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO events (
  id,
  organizer_id,
  title,
  description,
  venue_name,
  venue_address,
  event_date,
  doors_open_time,
  start_time,
  end_time,
  ticket_price,
  capacity,
  status
)
VALUES (
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000002',
  'Seed Test Live',
  'デバッグ用シードイベント',
  'Seed Hall',
  '東京都テスト区1-2-3',
  CURRENT_DATE + INTERVAL '14 day',
  '17:30',
  '18:00',
  '21:00',
  3000,
  200,
  'published'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO announcements (id, event_id, title, content)
VALUES (
  '00000000-0000-0000-0000-000000000060',
  '00000000-0000-0000-0000-000000000020',
  'Seed Notice',
  'これはデバッグ用のお知らせです。'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO entries (id, event_id, band_id, status, message)
VALUES (
  '00000000-0000-0000-0000-000000000040',
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000010',
  'approved',
  'シードエントリー申請です'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO performances (id, event_id, band_id, start_time, end_time, performance_order)
VALUES (
  '00000000-0000-0000-0000-000000000050',
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000010',
  '18:00',
  '18:40',
  1
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO reservations (id, event_id, user_id, reservation_number, status)
VALUES (
  '00000000-0000-0000-0000-000000000030',
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000004',
  'SEED-RES-0001',
  'reserved'
)
ON CONFLICT (id) DO NOTHING;
