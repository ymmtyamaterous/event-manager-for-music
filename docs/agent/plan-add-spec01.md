# 実装計画書：バグ修正・追加仕様・懸念事項対応

> 対象仕様ファイル: `docs/user/add-spec01.md`  
> 作成日: 2026-02-26

---

## 概要

`add-spec01.md` に記載されたバグ・追加仕様・懸念事項を調査した結果を踏まえ、以下の実装計画を策定した。

---

## 調査結果

### Bug 1: イベント作成時に「ユーザーが存在しません」エラー（404）

**原因箇所**: `backend/internal/store/postgres.go` の `CreateEvent` / `scanEvent`

`scanEvent` 関数は `sql.ErrNoRows` だけでなく、**あらゆる SQL エラー** を `false` として返す実装になっている。

```go
// 現在の実装
if errors.Is(err, sql.ErrNoRows) || err != nil {
    return model.Event{}, false
}
```

INSERT ... RETURNING が失敗した場合（外部キー制約違反・型エラー等）、`ok=false` → `ErrNotFound` → HTTP 404 "ユーザーが存在しません" というエラーチェーンが発生する。
本来は実際の DB エラーを適切に伝播させて 500 を返すべき箇所が、誤って 404 を返している。

### Bug 2: ログアウト機能がない

**原因箇所**: `frontend/components/layout/Header.tsx`

Header は静的コンポーネントであり、ログイン状態の判定・ログアウト処理が実装されていない。
常に「ログイン」ボタンが表示される。

### 追加仕様 1: レスポンシブ対応（ヘッダー）

**原因箇所**: `frontend/components/layout/Header.tsx`

ナビゲーションリンクが横並びで固定されており、スマートフォン等の小さい画面では崩れる。
ハンバーガーメニュー等のモバイル対応が未実装。

### 追加仕様 2: トップ画面のモックデータを削除

**原因箇所**:
- `frontend/app/page.tsx` → `featuredEvents`（モックデータ）を表示している
- `frontend/app/events/page.tsx` → API エラー時に `featuredEvents` へフォールバックしている
- `frontend/lib/mock-data.ts` → モックデータが残存

トップ画面は実際の API からイベント一覧を取得するよう変更し、モックデータを完全に排除する。

### 追加仕様 3: ログイン中はログアウトボタンを表示

Bug 2（ログアウト機能がない）と同一対応。Header のログイン状態判定と合わせて実装する。

### 懸念事項 1: マイページボタンを押すとトップ画面が表示される

**原因**: Header の「マイページ」リンクが `/audience` に固定されており、audience 以外のユーザーがアクセスすると `/` へリダイレクトされる（audience ページに `user_type !== "audience"` のガードがある）。

**判断**: これは仕様上の問題。ユーザー種別に応じて適切なマイページへ誘導すべき。

### 懸念事項 2: 運営者ログイン中に出演者ボタンが表示される

**原因**: Header のナビゲーションが全ユーザーに同一で表示されている。

**判断**: ユーザー種別に応じたロールベースのナビゲーションを実装すべき。

---

## 実装計画

### Task 1: バックエンド — イベント作成バグ修正

**対象ファイル**: `backend/internal/store/postgres.go`

- `scanEvent` 関数のシグネチャを `(model.Event, error)` に変更し、実際のエラーを返すよう修正
- `CreateEvent` 内でエラーを適切にハンドリング
  - 外部キー制約違反（pgx の `23503` コード）→ `ErrNotFound` を返す
  - その他 DB エラー → 元のエラーをそのまま返す（`handleCreateEvent` が 500 として処理する）
- `scanEvent` を使用している他の関数も同様に修正

**影響範囲**: `scanEvent` は複数箇所で使用されているため、全呼び出し箇所を修正する

---

### Task 2: フロントエンド — Header のクライアントコンポーネント化とログアウト実装

**対象ファイル**: `frontend/components/layout/Header.tsx`

- `"use client"` ディレクティブを追加
- `localStorage` からログイン状態・ユーザー情報を読み取る（`useEffect` + `useState`）
- ログイン状態に応じて以下を切り替え:
  - **未ログイン**: ログインボタンを表示
  - **ログイン済み**: ログアウトボタンを表示
- ログアウト処理:
  - `localStorage` から `access_token` / `refresh_token` / `user` を削除
  - `/` へリダイレクト

---

### Task 3: フロントエンド — Header のレスポンシブ対応

**対象ファイル**: `frontend/components/layout/Header.tsx`

- モバイル幅（`sm` 未満）ではハンバーガーメニューアイコンを表示
- メニュー開閉状態を `useState` で管理
- メニュー展開時はナビリンクを縦並びで表示（ドロップダウン or フルスクリーンオーバーレイ）
- PC 幅（`sm` 以上）では従来の横並びナビを維持

---

### Task 4: フロントエンド — ロールベースナビゲーション

**対象ファイル**: `frontend/components/layout/Header.tsx`（Task 2・3 と同一ファイル）

ユーザー種別に応じてヘッダーナビゲーションを変更:

| ユーザー状態 | 表示するナビ項目 |
|---|---|
| 未ログイン | イベント一覧 / ログイン |
| `audience` | イベント一覧 / マイページ (`/audience`) / プロフィール / ログアウト |
| `organizer` | イベント一覧 / 運営 (`/organizer`) / プロフィール / ログアウト |
| `performer` | イベント一覧 / 出演者 (`/performer`) / プロフィール / ログアウト |

これにより懸念事項 1・2 も同時に解消する。

---

### Task 5: フロントエンド — トップ画面のモックデータ削除・API 連携

**対象ファイル**:
- `frontend/app/page.tsx`
- `frontend/app/events/page.tsx`
- `frontend/lib/mock-data.ts`

- `page.tsx`: `featuredEvents` の代わりに `listEvents("")` API を呼び出し、最大3件を「開催予定イベント」として表示
  - ローディング中は skeleton や「読み込み中...」を表示
  - API エラー時はイベント一覧セクションを非表示（またはエラーメッセージ表示）
  - イベントが0件の場合は「現在公開中のイベントはありません」と表示
- `events/page.tsx`: API エラー時のモックデータへのフォールバックを削除し、空配列を表示
- `mock-data.ts`: ファイルを削除（または空にする）

---

## 実装順序

以下の順序で実装する:

1. **Task 1**: バックエンドのバグ修正（最優先：機能が動かないため）
2. **Task 2 + Task 3 + Task 4**: Header の改修（3タスクは同一ファイルのため一括実装）
3. **Task 5**: モックデータ削除・API 連携

---

## 影響範囲まとめ

| ファイル | 変更内容 |
|---|---|
| `backend/internal/store/postgres.go` | `scanEvent` のエラーハンドリング修正 |
| `frontend/components/layout/Header.tsx` | client 化・ログアウト・レスポンシブ・ロールベースナビ |
| `frontend/app/page.tsx` | モックデータ削除・API 連携 |
| `frontend/app/events/page.tsx` | モックデータフォールバック削除 |
| `frontend/lib/mock-data.ts` | ファイル削除 |

---

## 注意事項

- `scanEvent` の修正は広範囲に影響するため、修正後は既存のサーバーテストが通ることを確認する
- Header をクライアントコンポーネントに変更すると SSR で初期レンダリング時に localStorage が読めないため、`useEffect` 内で状態を更新するパターンを採用する（Hydration mismatch を防ぐ）
- モックデータ削除後はトップ画面・イベント一覧がDBの実データを参照するため、開発環境に適切なテストデータが必要
