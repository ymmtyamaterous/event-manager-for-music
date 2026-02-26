# 実装計画書 — add-spec02

> 対象仕様書: `docs/user/add-spec02.md`  
> 作成日: 2026-02-26

---

## 概要

`add-spec02.md` に記載された **バグ 1 件 / 追加仕様 9 件 / 懸念事項 1 件** の実装計画を示す。

---

## 1. バグ修正

### B-1. イベント編集時に 500 エラーが発生する

**原因分析**

1. フロントエンドの `APIEvent` 型 (`frontend/lib/api.ts`) が  
   `venue_address`, `doors_open_time`, `start_time`, `end_time` などのフィールドを持っていない。
2. 編集フォーム (`app/organizer/events/[id]/edit/page.tsx`) には  
   `title`, `description`, `venueName`, `eventDate`, `status` の 5 フィールドしかなく、  
   バックエンドが持つ必須項目（`venueAddress`, `doorsOpenTime`, `startTime` など）が欠落している。
3. 上記の欠落フィールドは JSON に含まれないため Go 側では `nil` ポインタになる。  
   PostgreSQL の `UpdateEvent` クエリ内の  
   `COALESCE(NULLIF($7, '')::time, doors_open_time)` などで型推論が曖昧になり  
   SQL エラーが発生して 500 を返している可能性がある。

**対応方針**

| # | 対象ファイル | 対応内容 |
|---|---|---|
| 1 | `frontend/lib/api.ts` | `APIEvent` 型に `venue_address`, `doors_open_time`, `start_time`, `end_time` を追加し、`toEventCard` も更新 |
| 2 | `frontend/types/index.ts` | `EventCard` 型に `venueAddress`, `doorsOpenTime`, `startTime`, `endTime` などを追加 |
| 3 | `frontend/app/organizer/events/[id]/edit/page.tsx` | 編集フォームに不足フィールド (`venueAddress`, `doorsOpenTime`, `startTime`, `endTime`, `ticketPrice`, `capacity`) を追加し、フォーム送信時に全フィールドを送信するよう修正 |
| 4 | `backend/internal/store/postgres.go` | `UpdateEvent` の SQL について `COALESCE(NULLIF($n, '')::TYPE, col)` パターンを `CASE WHEN $n IS NULL THEN col ELSE $n::TYPE END` に統一し、NULL 時の型推論エラーを回避する |

---

## 2. 追加仕様

### S-1. フッターをウィンドウ最下部に固定

**対応方針**

| # | 対象ファイル | 対応内容 |
|---|---|---|
| 1 | `frontend/components/layout/MainLayout.tsx` | コンテナを `flex flex-col min-h-screen` に変更し `<main>` を `flex-1` にすることで `<Footer>` がページ下部に固定されるよう修正 |

---

### S-2. ユーザープロフィール画像のアップロード

**対応方針**

| # | 対象ファイル | 対応内容 |
|---|---|---|
| 1 | `backend/internal/http/server.go` | `POST /api/v1/users/me/profile-image` エンドポイントを追加（multipart/form-data でファイル受信 → `UPLOAD_DIR` に保存 → `profile_image_path` を DB 更新）|
| 2 | `backend/internal/store/postgres.go` | `UpdateUserProfileImage(userID, path string)` メソッドを追加 |
| 3 | `backend/internal/store/repository.go` | `Repository` インターフェースに上記メソッドを追加 |
| 4 | `backend/internal/store/memory.go` | `UpdateUserProfileImage` のメモリ実装を追加 |
| 5 | `backend/internal/http/server.go` | 静的ファイル配信 (`/uploads/` パス) を追加 |
| 6 | `frontend/lib/api.ts` | `uploadProfileImage(accessToken, file)` 関数を追加 |
| 7 | `frontend/app/profile/page.tsx` | プロフィール画像のプレビュー・アップロード UI を追加 |
| 8 | `backend/openapi.yaml` | `POST /users/me/profile-image` エンドポイントの定義を追加 |

---

### S-3. デバッグ用テストデータのシードマイグレーション

**対応方針**

| # | 対象ファイル | 対応内容 |
|---|---|---|
| 1 | `backend/migrations/010_seed_test_data.sql` | ユーザー (各ロール)、バンド、イベント、予約などのテストデータ INSERT を追加 |
| 2 | `backend/migrations/010_seed_test_data.down.sql` | テストデータを DELETE する down マイグレーションを追加 |
| 3 | `backend/cmd/migrate/main.go` | `seed` / `unseed` サブコマンドとして上記マイグレーションを実行できるよう拡張（または `up-seed` / `down-seed` として別コマンドに分離） |

---

### S-4. パスワード入力欄に表示/非表示切り替えアイコン

**対応方針**

| # | 対象ファイル | 対応内容 |
|---|---|---|
| 1 | `frontend/components/ui/PasswordInput.tsx` (新規) | 目のアイコン付きパスワード入力コンポーネントを作成 |
| 2 | `frontend/app/login/page.tsx` | パスワード入力を `PasswordInput` に差し替え |
| 3 | `frontend/app/register/page.tsx` | パスワード・確認パスワード入力を `PasswordInput` に差し替え |

---

### S-5. ログアウト確認モーダル

**対応方針**

| # | 対象ファイル | 対応内容 |
|---|---|---|
| 1 | `frontend/components/layout/Header.tsx` | ログアウトボタン押下時に確認モーダルを表示し、確認後に `handleLogout` を実行するよう修正。モーダル背景は `bg-black/50` で透過 |

---

### S-6. ブラウザ標準モーダルをカスタム UI に置き換え

対象箇所: `window.prompt` / `window.confirm` を使用している以下の箇所

| # | 対象ファイル | 置き換え内容 |
|---|---|---|
| 1 | `frontend/app/organizer/events/[id]/entries/page.tsx` | **承認モーダル**: 開始時刻・終了時刻・出演順を入力するカスタムモーダル UI に変更 |
| 2 | `frontend/app/organizer/events/[id]/entries/page.tsx` | **却下モーダル**: 却下理由を入力するカスタムモーダル UI に変更 |
| 3 | `frontend/app/performer/page.tsx` | **エントリー申請モーダル**: 申請メッセージを入力するカスタムモーダル UI に変更 |

各モーダルは背景を `bg-black/50` で透過し、既存の performances 編集モーダルと同様のスタイルで統一する。

---

### S-7. タイムテーブルのドラッグ＆ドロップ並び替え

**対応方針**

| # | 対象ファイル | 対応内容 |
|---|---|---|
| 1 | `frontend/package.json` | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` を追加 |
| 2 | `frontend/app/organizer/events/[id]/performances/page.tsx` | DnD ライブラリ (`@dnd-kit/sortable`) を用いてリストをドラッグ＆ドロップで並び替えられるよう実装。並び替え後は `updateEventPerformance` を順番に呼び出して `performance_order` を一括更新 |

---

### S-8. イベントへのフライヤー画像設定

DBスキーマには `events.flyer_image_path` カラムが既に存在しているため、バックエンドの実装・フロントエンドの UI を追加するのみ。

**対応方針**

| # | 対象ファイル | 対応内容 |
|---|---|---|
| 1 | `backend/internal/model/types.go` | `Event` / `CreateEventInput` / `UpdateEventInput` に `FlyerImagePath *string` を追加 |
| 2 | `backend/internal/http/server.go` | `POST /api/v1/events/{id}/flyer-image` エンドポイントを追加（multipart/form-data → `UPLOAD_DIR` 保存 → `flyer_image_path` 更新） |
| 3 | `backend/internal/store/postgres.go` | `UpdateEventFlyerImage(eventID, organizerID, path string)` メソッドを追加、`scanEvent` で `flyer_image_path` もスキャン |
| 4 | `backend/internal/store/repository.go` | `Repository` インターフェースに上記メソッドを追加 |
| 5 | `backend/internal/store/memory.go` | `UpdateEventFlyerImage` のメモリ実装を追加 |
| 6 | `frontend/lib/api.ts` | `uploadEventFlyerImage(eventId, accessToken, file)` 関数を追加、`APIEvent` / `EventCard` に `flyerImagePath` を追加 |
| 7 | `frontend/app/organizer/events/[id]/edit/page.tsx` | フライヤー画像アップロード UI を追加 |
| 8 | `frontend/app/events/[id]/page.tsx` | フライヤー画像を表示するエリアを追加 |
| 9 | `backend/openapi.yaml` | `POST /events/{id}/flyer-image` エンドポイントの定義を追加 |

---

### S-9. 出演者による登録済みバンド編集機能

DBスキーマには `bands.profile_image_path` / `band_members` テーブルが既に存在している。  
セットリスト (`setlists`) テーブルはまだ存在しないため、マイグレーションが必要。

**対応方針**

#### 9-A. バックエンド

| # | 対象ファイル | 対応内容 |
|---|---|---|
| 1 | `backend/migrations/010_create_setlists.sql` (または連番繰り上げ) | `setlists` テーブルを作成するマイグレーション追加 |
| 2 | `backend/internal/model/types.go` | `Band` に `ProfileImagePath`, `FormedYear`, `TwitterURL` 等を追加。`BandMember`, `Setlist` 型を新規追加 |
| 3 | `backend/internal/http/server.go` | 以下エンドポイントを追加: `PATCH /api/v1/bands/{id}` (バンド基本情報更新), `POST /api/v1/bands/{id}/profile-image` (プロフィール画像), `GET /api/v1/bands/{id}/members` (メンバー一覧), `PUT /api/v1/bands/{id}/members` (メンバー一括更新), `GET /api/v1/bands/{id}/setlists` (セットリスト一覧), `POST /api/v1/bands/{id}/setlists` (セットリスト追加), `DELETE /api/v1/bands/{id}/setlists/{setlistId}` (セットリスト削除) |
| 4 | `backend/internal/store/postgres.go` | 上記に対応する Store メソッドを追加 |
| 5 | `backend/internal/store/repository.go` | `Repository` インターフェースに上記メソッドを追加 |
| 6 | `backend/internal/store/memory.go` | メモリ実装を追加 |
| 7 | `backend/openapi.yaml` | 上記エンドポイント定義を追加 |

#### 9-B. フロントエンド

| # | 対象ファイル | 対応内容 |
|---|---|---|
| 1 | `frontend/app/performer/bands/[id]/page.tsx` (新規) | バンド詳細・編集ページ（基本情報・メンバー・セットリスト・プロフィール画像）を実装 |
| 2 | `frontend/app/performer/page.tsx` | バンド一覧からバンド編集ページへのリンクを追加 |
| 3 | `frontend/app/performer/page.tsx` | バンド新規登録フォームにもプロフィール画像・メンバー・セットリストの入力欄を追加 |
| 4 | `frontend/lib/api.ts` | バンド編集・メンバー管理・セットリスト管理の API 関数を追加 |
| 5 | `frontend/types/index.ts` | `BandMember`, `Setlist` 型を追加 |

---

## 3. 懸念事項対応

### C-1. ログイン後トップ画面に「新規登録」ボタンが表示される違和感

**対応方針**

| # | 対象ファイル | 対応内容 |
|---|---|---|
| 1 | `frontend/app/page.tsx` | ログイン済みユーザー (`localStorage` の `user` が存在する) の場合、ヒーローセクションの「新規登録」ボタンを非表示にする（またはログイン後のユーザーに適した別のリンクに変更） |

---

## 実装優先順位（推奨）

| 優先度 | 項目 | 理由 |
|---|---|---|
| 🔴 高 | B-1 イベント編集 500 エラー修正 | 既存機能のバグで影響範囲が大きい |
| 🔴 高 | S-1 フッター固定 | 全ページに影響する UI 改善 |
| 🔴 高 | S-4 パスワード表示切り替え | 認証フローの UX 改善 |
| 🔴 高 | S-5 ログアウト確認モーダル | 誤操作防止の安全性改善 |
| 🟡 中 | S-6 ブラウザ標準モーダル置き換え | UX の一貫性改善 |
| 🟡 中 | S-2 プロフィール画像アップロード | ユーザー体験向上 |
| 🟡 中 | S-8 フライヤー画像 | イベント情報の充実 |
| 🟡 中 | C-1 トップページ「新規登録」ボタン表示制御 | 軽微な UX 改善 |
| 🟢 低 | S-3 シードマイグレーション | 開発環境のみの機能 |
| 🟢 低 | S-7 DnD 並び替え | 便利機能だが代替操作が既存 |
| 🟢 低 | S-9 バンド編集機能 | 新規機能で範囲が広い |

---

## 備考

- ファイルアップロード機能 (S-2, S-8, S-9) は環境変数 `UPLOAD_DIR` でアップロード先ディレクトリを設定すること
- 静的ファイル配信は `GET /uploads/{filename}` パスでバックエンドから直接配信する
- セットリストテーブルの migration 連番は既存の `009` の次番号に合わせて調整すること
- 各機能追加時にはユニットテストを実施すること（バックエンドは `server_test.go` / `runner_test.go`、フロントエンドは `__tests__` ディレクトリを作成）
