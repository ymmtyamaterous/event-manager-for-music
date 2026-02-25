# API仕様書

> **作成日**: 2026-02-25
> **対象バージョン**: Event Manager v1.0
> **実装**: Go（Air によるホットリロード）

---

## 1. 概要

### 共通仕様

| 項目 | 値 |
|------|-----|
| ベースURL | `http://{HOST}:{API_PORT}/api/v1` |
| HOST | 環境変数 `HOST`（デフォルト: `localhost`） |
| API_PORT | 環境変数 `API_PORT`（デフォルト: `8000`） |
| レスポンス形式 | JSON |
| 認証方式 | Bearer Token（JWT） |
| 文字コード | UTF-8 |
| タイムゾーン | Asia/Tokyo |
| CORS許可オリジン | 環境変数 `ALLOWED_ORIGINS` |

### 認証ヘッダー

```
Authorization: Bearer {access_token}
```

### 共通エラーレスポンス形式

```json
{
  "error": "エラーメッセージ"
}
```

### HTTPステータスコード

| コード | 説明 |
|--------|------|
| 200 | 成功 |
| 201 | 作成成功 |
| 204 | 削除成功（ボディなし） |
| 400 | バリデーションエラー |
| 401 | 未認証 |
| 403 | 権限なし |
| 404 | リソースが存在しない |
| 409 | 重複エラー |
| 500 | サーバーエラー |

---

## 2. 認証API

### 2.1 ログイン

| 項目 | 値 |
|------|-----|
| メソッド | `POST` |
| パス | `/api/v1/auth/login` |
| 認証 | 不要 |

**リクエストボディ**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**レスポンス（200 OK）**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "first_name": "山田",
    "last_name": "太郎",
    "display_name": "ヤマダ",
    "user_type": "organizer",
    "profile_image_path": null,
    "created_at": "2026-01-01T00:00:00+09:00",
    "updated_at": "2026-01-01T00:00:00+09:00"
  }
}
```

**エラー（401）**: メールアドレスまたはパスワードが一致しない場合

---

### 2.2 ユーザー登録

| 項目 | 値 |
|------|-----|
| メソッド | `POST` |
| パス | `/api/v1/auth/register` |
| 認証 | 不要 |

**リクエストボディ**

```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "first_name": "田中",
  "last_name": "次郎",
  "display_name": "ジロー",
  "user_type": "audience"
}
```

**バリデーション**
- `email`: 必須、メール形式
- `password`: 必須、8文字以上、英数字混在
- `first_name`, `last_name`, `display_name`: 必須
- `user_type`: `organizer` / `performer` / `audience` のいずれか（`admin` は登録不可）

**レスポンス（201 Created）**: `access_token`, `refresh_token`, `user` を含むオブジェクト

**エラー（409）**: メールアドレスが既に使用されている場合

---

### 2.3 トークンリフレッシュ

| 項目 | 値 |
|------|-----|
| メソッド | `POST` |
| パス | `/api/v1/auth/refresh` |
| 認証 | 不要（リフレッシュトークンをボディで送信） |

**リクエストボディ**

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**レスポンス（200 OK）**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 3. ユーザーAPI

### 3.1 ログインユーザー情報取得

| 項目 | 値 |
|------|-----|
| メソッド | `GET` |
| パス | `/api/v1/users/me` |
| 認証 | 必要 |

**レスポンス（200 OK）**: User オブジェクト

---

### 3.2 ユーザー情報更新

| 項目 | 値 |
|------|-----|
| メソッド | `PATCH` |
| パス | `/api/v1/users/me` |
| 認証 | 必要 |

**リクエストボディ**

```json
{
  "first_name": "山田",
  "last_name": "太郎",
  "display_name": "ヤマダ",
  "email": "new@example.com"
}
```

**レスポンス（200 OK）**: 更新後の User オブジェクト

---

### 3.3 プロフィール画像アップロード

| 項目 | 値 |
|------|-----|
| メソッド | `POST` |
| パス | `/api/v1/users/me/avatar` |
| 認証 | 必要 |
| Content-Type | `multipart/form-data` |

**リクエスト**
- `file`: 画像ファイル（`image/*`、最大5MB）

**レスポンス（200 OK）**

```json
{
  "profile_image_path": "/uploads/avatars/550e8400-e29b-41d4-a716-446655440000.jpg"
}
```

---

### 3.4 パスワード変更

| 項目 | 値 |
|------|-----|
| メソッド | `POST` |
| パス | `/api/v1/users/me/password` |
| 認証 | 必要 |

**リクエストボディ**

```json
{
  "current_password": "oldpassword",
  "new_password": "newpassword123"
}
```

**レスポンス（200 OK）**: `{ "message": "パスワードを更新しました" }`

---

## 4. イベントAPI

### 4.1 イベント一覧取得

| 項目 | 値 |
|------|-----|
| メソッド | `GET` |
| パス | `/api/v1/events` |
| 認証 | 不要 |

**クエリパラメータ**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `status` | string | - | ステータスフィルター（`draft` / `published` / `cancelled`） |
| `search` | string | - | タイトル・会場名・説明文でのキーワード検索（ILIKE） |
| `organizer_id` | string | - | 運営者IDでフィルター |

**レスポンス（200 OK）**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "organizer_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "春の音楽祭 2026",
    "description": "春の音楽祭です",
    "venue_name": "渋谷 CLUB ASIA",
    "venue_address": "東京都渋谷区円山町1-8",
    "event_date": "2026-03-20",
    "doors_open_time": "18:00",
    "start_time": "19:00",
    "end_time": "22:00",
    "ticket_price": 3000,
    "capacity": 200,
    "status": "published",
    "created_at": "2026-01-15T00:00:00+09:00",
    "updated_at": "2026-01-15T00:00:00+09:00"
  }
]
```

---

### 4.2 イベント詳細取得

| 項目 | 値 |
|------|-----|
| メソッド | `GET` |
| パス | `/api/v1/events/{id}` |
| 認証 | 不要 |

**レスポンス（200 OK）**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "title": "春の音楽祭 2026",
  "organizer": { "id": "...", "display_name": "ヤマダ" },
  "performances": [
    {
      "id": "...",
      "band_id": "...",
      "start_time": "19:00",
      "end_time": "19:40",
      "performance_order": 1,
      "band": {
        "id": "...",
        "name": "The Rock Stars",
        "genre": "Rock",
        "profile_image_path": null
      }
    }
  ],
  "announcements": [
    {
      "id": "...",
      "title": "タイムテーブル公開！",
      "content": "...",
      "published_at": "2026-01-14T00:00:00+09:00"
    }
  ],
  "reservation_count": 5
}
```

**エラー（404）**: イベントが存在しない場合

---

### 4.3 イベント作成

| 項目 | 値 |
|------|-----|
| メソッド | `POST` |
| パス | `/api/v1/events` |
| 認証 | 必要（`organizer` のみ） |

**リクエストボディ**

```json
{
  "title": "新しいイベント",
  "description": "イベントの説明",
  "venue_name": "渋谷 CLUB ASIA",
  "venue_address": "東京都渋谷区円山町1-8",
  "event_date": "2026-06-01",
  "doors_open_time": "18:00",
  "start_time": "19:00",
  "end_time": "22:00",
  "ticket_price": 3000,
  "capacity": 200,
  "status": "draft"
}
```

**レスポンス（201 Created）**: 作成された Event オブジェクト

---

### 4.4 イベント更新

| 項目 | 値 |
|------|-----|
| メソッド | `PATCH` |
| パス | `/api/v1/events/{id}` |
| 認証 | 必要（イベントオーナーのみ） |

**リクエストボディ**: 更新したいフィールドのみ送信

**レスポンス（200 OK）**: 更新後の Event オブジェクト

---

### 4.5 イベント削除

| 項目 | 値 |
|------|-----|
| メソッド | `DELETE` |
| パス | `/api/v1/events/{id}` |
| 認証 | 必要（イベントオーナーのみ） |

**レスポンス（204 No Content）**

---

## 5. バンドAPI

### 5.1 バンド一覧取得

| 項目 | 値 |
|------|-----|
| メソッド | `GET` |
| パス | `/api/v1/bands` |
| 認証 | 不要 |

**クエリパラメータ**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `owner_id` | string | - | オーナーIDでフィルター |

**レスポンス（200 OK）**: Band オブジェクトの配列

---

### 5.2 バンド詳細取得

| 項目 | 値 |
|------|-----|
| メソッド | `GET` |
| パス | `/api/v1/bands/{id}` |
| 認証 | 不要 |

**レスポンス（200 OK）**: BandDetail オブジェクト（`members`、`performances` を含む）

---

### 5.3 バンド作成

| 項目 | 値 |
|------|-----|
| メソッド | `POST` |
| パス | `/api/v1/bands` |
| 認証 | 必要（`performer` のみ） |

**リクエストボディ**

```json
{
  "name": "The New Band",
  "genre": "Rock",
  "formed_year": 2024,
  "description": "バンドの説明",
  "twitter_url": "https://x.com/newband",
  "members": [
    { "name": "佐藤花子", "part": "Vocal", "display_order": 1 },
    { "name": "田中太郎", "part": "Guitar", "display_order": 2 }
  ]
}
```

**レスポンス（201 Created）**: 作成された Band オブジェクト（メンバー情報含む）

---

### 5.4 バンド更新

| 項目 | 値 |
|------|-----|
| メソッド | `PATCH` |
| パス | `/api/v1/bands/{id}` |
| 認証 | 必要（バンドオーナーのみ） |

**リクエストボディ**: 更新したいフィールドのみ送信（`members` を含む場合は全件置換）

**レスポンス（200 OK）**: 更新後の Band オブジェクト

---

### 5.5 バンド画像アップロード

| 項目 | 値 |
|------|-----|
| メソッド | `POST` |
| パス | `/api/v1/bands/{id}/image` |
| 認証 | 必要（バンドオーナーのみ） |
| Content-Type | `multipart/form-data` |

**リクエスト**
- `file`: 画像ファイル（`image/*`、最大5MB）

**レスポンス（200 OK）**

```json
{
  "profile_image_path": "/uploads/bands/550e8400-e29b-41d4-a716-446655440000.jpg"
}
```

---

## 6. 出演情報API

### 6.1 出演バンド追加（直接追加）

| 項目 | 値 |
|------|-----|
| メソッド | `POST` |
| パス | `/api/v1/events/{eventId}/performances` |
| 認証 | 必要（イベントオーナーのみ） |

**リクエストボディ**

```json
{
  "band_id": "550e8400-e29b-41d4-a716-446655440002",
  "start_time": "19:00",
  "end_time": "19:45",
  "performance_order": 1
}
```

**レスポンス（201 Created）**: Performance オブジェクト

---

### 6.2 出演バンド削除

| 項目 | 値 |
|------|-----|
| メソッド | `DELETE` |
| パス | `/api/v1/events/{eventId}/performances/{performanceId}` |
| 認証 | 必要（イベントオーナーのみ） |

**レスポンス（204 No Content）**

---

## 7. お知らせAPI

### 7.1 お知らせ追加

| 項目 | 値 |
|------|-----|
| メソッド | `POST` |
| パス | `/api/v1/events/{eventId}/announcements` |
| 認証 | 必要（イベントオーナーのみ） |

**リクエストボディ**

```json
{
  "title": "タイムテーブル公開！",
  "content": "詳細はこちらをご確認ください。"
}
```

**レスポンス（201 Created）**: Announcement オブジェクト

---

### 7.2 お知らせ更新

| 項目 | 値 |
|------|-----|
| メソッド | `PATCH` |
| パス | `/api/v1/events/{eventId}/announcements/{announcementId}` |
| 認証 | 必要（イベントオーナーのみ） |

**レスポンス（200 OK）**: 更新後の Announcement オブジェクト

---

### 7.3 お知らせ削除

| 項目 | 値 |
|------|-----|
| メソッド | `DELETE` |
| パス | `/api/v1/events/{eventId}/announcements/{announcementId}` |
| 認証 | 必要（イベントオーナーのみ） |

**レスポンス（204 No Content）**

---

## 8. 予約API

### 8.1 予約一覧取得

| 項目 | 値 |
|------|-----|
| メソッド | `GET` |
| パス | `/api/v1/reservations` |
| 認証 | 必要 |

**クエリパラメータ**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `user_id` | string | - | ユーザーIDでフィルター（管理者・本人のみ） |
| `event_id` | string | - | イベントIDでフィルター（イベントオーナーのみ） |
| `status` | string | - | `reserved` / `cancelled` でフィルター |

**レスポンス（200 OK）**: Reservation オブジェクトの配列（`event`、`user` 情報付き）

---

### 8.2 予約作成

| 項目 | 値 |
|------|-----|
| メソッド | `POST` |
| パス | `/api/v1/reservations` |
| 認証 | 必要（`audience` のみ） |

**リクエストボディ**

```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440001"
}
```

**バリデーション（サーバーサイド）**
- イベントが存在し `status = published` であること
- 定員に達していないこと（`capacity` が設定されている場合）
- 同一ユーザーの重複予約がないこと

**レスポンス（201 Created）**: 作成された Reservation オブジェクト

**エラー（409）**: 重複予約または定員超過

---

### 8.3 予約キャンセル

| 項目 | 値 |
|------|-----|
| メソッド | `PATCH` |
| パス | `/api/v1/reservations/{id}/cancel` |
| 認証 | 必要（予約者本人のみ） |

**レスポンス（200 OK）**: 更新後の Reservation オブジェクト

---

## 9. エントリー申請API

### 9.1 バンド別エントリー申請取得

| 項目 | 値 |
|------|-----|
| メソッド | `GET` |
| パス | `/api/v1/bands/{bandId}/entries` |
| 認証 | 必要（バンドオーナーのみ） |

**レスポンス（200 OK）**: Entry オブジェクトの配列（`event` 情報付き）

---

### 9.2 イベント別エントリー申請取得

| 項目 | 値 |
|------|-----|
| メソッド | `GET` |
| パス | `/api/v1/events/{eventId}/entries` |
| 認証 | 必要（イベントオーナーのみ） |

**クエリパラメータ**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `status` | string | - | `pending` / `approved` / `rejected` でフィルター |

**レスポンス（200 OK）**: Entry オブジェクトの配列（`band` 情報付き）

---

### 9.3 エントリー申請作成

| 項目 | 値 |
|------|-----|
| メソッド | `POST` |
| パス | `/api/v1/events/{eventId}/entries` |
| 認証 | 必要（`performer` のみ） |

**リクエストボディ**

```json
{
  "band_id": "550e8400-e29b-41d4-a716-446655440002",
  "message": "ぜひ出演させていただきたいです！"
}
```

**バリデーション**: 同一バンド・同一イベントの重複申請チェック

**レスポンス（201 Created）**: Entry オブジェクト

**エラー（409）**: 重複申請

---

### 9.4 エントリー申請承認

| 項目 | 値 |
|------|-----|
| メソッド | `PATCH` |
| パス | `/api/v1/entries/{id}/approve` |
| 認証 | 必要（イベントオーナーのみ） |

**副作用**: `performances` テーブルに自動でバンドを追加（`performance_order` は既存件数+1）

**レスポンス（200 OK）**: 更新後の Entry オブジェクト

---

### 9.5 エントリー申請却下

| 項目 | 値 |
|------|-----|
| メソッド | `PATCH` |
| パス | `/api/v1/entries/{id}/reject` |
| 認証 | 必要（イベントオーナーのみ） |

**リクエストボディ**

```json
{
  "rejection_reason": "募集ジャンルに合致しないため"
}
```

**レスポンス（200 OK）**: 更新後の Entry オブジェクト

---

## 10. エンドポイント一覧

| メソッド | パス | 認証 | 説明 |
|---------|------|------|------|
| POST | `/api/v1/auth/login` | - | ログイン |
| POST | `/api/v1/auth/register` | - | ユーザー登録 |
| POST | `/api/v1/auth/refresh` | - | トークンリフレッシュ |
| GET | `/api/v1/users/me` | ✓ | ログインユーザー情報取得 |
| PATCH | `/api/v1/users/me` | ✓ | ユーザー情報更新 |
| POST | `/api/v1/users/me/avatar` | ✓ | プロフィール画像アップロード |
| POST | `/api/v1/users/me/password` | ✓ | パスワード変更 |
| GET | `/api/v1/events` | - | イベント一覧取得 |
| POST | `/api/v1/events` | ✓(organizer) | イベント作成 |
| GET | `/api/v1/events/{id}` | - | イベント詳細取得 |
| PATCH | `/api/v1/events/{id}` | ✓(owner) | イベント更新 |
| DELETE | `/api/v1/events/{id}` | ✓(owner) | イベント削除 |
| POST | `/api/v1/events/{id}/performances` | ✓(owner) | 出演バンド追加 |
| DELETE | `/api/v1/events/{id}/performances/{pid}` | ✓(owner) | 出演バンド削除 |
| POST | `/api/v1/events/{id}/announcements` | ✓(owner) | お知らせ追加 |
| PATCH | `/api/v1/events/{id}/announcements/{aid}` | ✓(owner) | お知らせ更新 |
| DELETE | `/api/v1/events/{id}/announcements/{aid}` | ✓(owner) | お知らせ削除 |
| GET | `/api/v1/events/{id}/entries` | ✓(owner) | イベント別エントリー取得 |
| POST | `/api/v1/events/{id}/entries` | ✓(performer) | エントリー申請作成 |
| GET | `/api/v1/bands` | - | バンド一覧取得 |
| POST | `/api/v1/bands` | ✓(performer) | バンド作成 |
| GET | `/api/v1/bands/{id}` | - | バンド詳細取得 |
| PATCH | `/api/v1/bands/{id}` | ✓(owner) | バンド更新 |
| POST | `/api/v1/bands/{id}/image` | ✓(owner) | バンド画像アップロード |
| GET | `/api/v1/bands/{id}/entries` | ✓(owner) | バンド別エントリー取得 |
| GET | `/api/v1/reservations` | ✓ | 予約一覧取得 |
| POST | `/api/v1/reservations` | ✓(audience) | 予約作成 |
| PATCH | `/api/v1/reservations/{id}/cancel` | ✓(owner) | 予約キャンセル |
| PATCH | `/api/v1/entries/{id}/approve` | ✓(event_owner) | エントリー承認 |
| PATCH | `/api/v1/entries/{id}/reject` | ✓(event_owner) | エントリー却下 |

---

## 11. バックエンドディレクトリ構成

```
backend/
├── cmd/
│   ├── server/
│   │   └── main.go          # サーバー起動エントリーポイント
│   └── migrate/
│       └── main.go          # マイグレーションCLI
├── internal/
│   ├── handler/             # HTTPハンドラー
│   ├── middleware/          # JWT認証ミドルウェア等
│   ├── repository/          # DB操作
│   ├── service/             # ビジネスロジック
│   └── model/               # データモデル
├── migrations/              # SQLマイグレーションファイル
├── openapi.yaml             # OpenAPI 3.0 仕様書
├── .air.toml                # Air設定ファイル
└── go.mod
```

### 環境変数一覧

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| `HOST` | ホスト名 | `localhost` |
| `API_PORT` | APIポート番号 | `8000` |
| `ALLOWED_ORIGINS` | CORS許可オリジン（カンマ区切り） | `http://localhost:3000` |
| `DATABASE_URL` | PostgreSQL接続URL | - |
| `JWT_SECRET` | JWT署名秘密鍵 | - |
| `UPLOAD_DIR` | ファイルアップロード保存先ディレクトリ | `/uploads` |
