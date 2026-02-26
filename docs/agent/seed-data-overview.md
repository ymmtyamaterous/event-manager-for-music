**シードデータ概要**

- **ファイル**: `backend/migrations/010_seed_test_data.sql`
- **実行方法**: `go run ./cmd/migrate seed`
- **ロールバック**: `go run ./cmd/migrate unseed`（対応する `.down.sql` を実行して取り消す）
- **前提**: `DATABASE_URL` 環境変数を設定すること。`

**投入データ（テーブルごと）**

- **users**: 4件
  - id: 固定UUID（例: `00000000-0000-0000-0000-000000000001` など）
  - email: seed-admin@example.com, seed-organizer@example.com, seed-performer@example.com, seed-audience@example.com
  - password_hash: bcrypt 風のプレースホルダ（実運用では差し替えが必要）
  - first_name/last_name/display_name, user_type: admin / organizer / performer / audience
  - 備考: `ON CONFLICT (id) DO NOTHING` により冪等性あり

- **bands**: 1件
  - id: `00000000-0000-0000-0000-000000000010`
  - owner_id: シードの performer ユーザID
  - name: "Seed Echoes", genre: "Rock", description: "デバッグ用のテストバンド"

- **band_members**: 2件
  - メンバー名: "Seed Vocal", "Seed Guitar"
  - part: Vocal / Guitar
  - display_order: 1, 2

- **events**: 1件
  - id: `00000000-0000-0000-0000-000000000020`
  - organizer_id: シード organizer ユーザID
  - title: "Seed Test Live"
  - event_date: `CURRENT_DATE + INTERVAL '14 day'`（実行日から相対日付）
  - doors_open_time/start_time/end_time, ticket_price, capacity, status: 'published'

- **announcements**: 1件
  - イベントに紐づくお知らせ（タイトル: "Seed Notice"）

- **entries**: 1件
  - event と band のエントリー（status: 'approved', message: 'シードエントリー申請です'）

- **performances**: 1件
  - event と band に紐づくパフォーマンス（開始/終了時刻、order）

- **reservations**: 1件
  - user (audience) による予約（reservation_number: 'SEED-RES-0001', status: 'reserved'）

**その他の重要点**

- ファイル名に `_seed_` を含むため、`internal/migrate` のロジック上は「シード用マイグレーション」として扱われます。
- 各 INSERT は `ON CONFLICT (id) DO NOTHING` を使っているため、再実行しても重複エラーになりにくい（ただし参照整合は実行順と既存データによる）。
- パスワードはダミーハッシュなので、本番データとして使わないでください。

**参照**

- マイグレーション実行コード: `cmd/migrate` -> `internal/migrate/runner.go`
- シードSQL: `backend/migrations/010_seed_test_data.sql`
