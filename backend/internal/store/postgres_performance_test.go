package store

import (
	"os"
	"testing"

	"github.com/ymmtyamaterous/event-manager-for-music-api/internal/model"
)

// TestPostgresPerformances は PostgreSQL を使った ListPerformancesByEvent / UpdatePerformance の統合テストです。
// DATABASE_URL が設定されていない場合はスキップします。
func TestPostgresPerformances(t *testing.T) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		t.Skip("DATABASE_URL が設定されていないためスキップします")
	}

	s, err := NewPostgresStore(dbURL)
	if err != nil {
		t.Fatalf("PostgresStore の初期化に失敗しました: %v", err)
	}

	// --- テスト用データ準備 ---

	// organizer ユーザーを作成
	orgHash := "$2a$10$test-organizer-hash-xx"
	org, err := s.CreateUser(model.User{
		Email:        "test-org-perf@example.com",
		PasswordHash: orgHash,
		FirstName:    "Test",
		LastName:     "Org",
		DisplayName:  "Test Org",
		UserType:     model.UserTypeOrganizer,
	})
	if err != nil {
		t.Fatalf("organizer ユーザー作成に失敗しました: %v", err)
	}
	t.Cleanup(func() {
		s.db.Exec(`DELETE FROM users WHERE id = $1`, org.ID)
	})

	// performer ユーザーを作成
	perfHash := "$2a$10$test-performer-hash-xx"
	perf, err := s.CreateUser(model.User{
		Email:        "test-perf-perf@example.com",
		PasswordHash: perfHash,
		FirstName:    "Test",
		LastName:     "Perf",
		DisplayName:  "Test Performer",
		UserType:     model.UserTypePerformer,
	})
	if err != nil {
		t.Fatalf("performer ユーザー作成に失敗しました: %v", err)
	}
	t.Cleanup(func() {
		s.db.Exec(`DELETE FROM users WHERE id = $1`, perf.ID)
	})

	// イベントを作成
	event, err := s.CreateEvent(model.CreateEventInput{
		OrganizerID:   org.ID,
		Title:         "テスト用ライブイベント",
		VenueName:     "テストホール",
		VenueAddress:  "東京都テスト区1-1-1",
		EventDate:     "2026-12-01",
		DoorsOpenTime: "17:30",
		StartTime:     "18:00",
		Status:        model.EventStatusPublished,
	})
	if err != nil {
		t.Fatalf("イベント作成に失敗しました: %v", err)
	}
	t.Cleanup(func() {
		s.db.Exec(`DELETE FROM events WHERE id = $1`, event.ID)
	})

	// バンド1 を作成
	band1, err := s.CreateBand(perf.ID, "テストバンドA", "Rock", "テスト用バンドA")
	if err != nil {
		t.Fatalf("バンド1 作成に失敗しました: %v", err)
	}
	t.Cleanup(func() {
		s.db.Exec(`DELETE FROM bands WHERE id = $1`, band1.ID)
	})

	// バンド2 を作成
	band2, err := s.CreateBand(perf.ID, "テストバンドB", "Jazz", "テスト用バンドB")
	if err != nil {
		t.Fatalf("バンド2 作成に失敗しました: %v", err)
	}
	t.Cleanup(func() {
		s.db.Exec(`DELETE FROM bands WHERE id = $1`, band2.ID)
	})

	// エントリーを申請して承認（パフォーマンスが生成される）
	startTime1 := "18:00"
	endTime1 := "18:40"
	order1 := 1
	_, err = s.ApproveEntry(
		func() string {
			entry, err := s.CreateEntry(event.ID, perf.ID, band1.ID, "バンドAの申請")
			if err != nil {
				t.Fatalf("バンド1 エントリー作成に失敗しました: %v", err)
			}
			return entry.ID
		}(),
		org.ID,
		&startTime1,
		&endTime1,
		&order1,
	)
	if err != nil {
		t.Fatalf("バンド1 エントリー承認に失敗しました: %v", err)
	}

	startTime2 := "19:00"
	endTime2 := "19:40"
	order2 := 2
	_, err = s.ApproveEntry(
		func() string {
			entry, err := s.CreateEntry(event.ID, perf.ID, band2.ID, "バンドBの申請")
			if err != nil {
				t.Fatalf("バンド2 エントリー作成に失敗しました: %v", err)
			}
			return entry.ID
		}(),
		org.ID,
		&startTime2,
		&endTime2,
		&order2,
	)
	if err != nil {
		t.Fatalf("バンド2 エントリー承認に失敗しました: %v", err)
	}

	// --- ListPerformancesByEvent のテスト ---
	t.Run("ListPerformancesByEvent", func(t *testing.T) {
		performances, err := s.ListPerformancesByEvent(event.ID)
		if err != nil {
			t.Fatalf("ListPerformancesByEvent が失敗しました: %v", err)
		}

		if len(performances) != 2 {
			t.Fatalf("パフォーマンス件数が不正です: got=%d, want=2", len(performances))
		}

		// performance_order でソートされているはず
		p1 := performances[0]
		p2 := performances[1]

		if p1.PerformanceOrder != 1 {
			t.Errorf("1件目の出演順が不正です: got=%d, want=1", p1.PerformanceOrder)
		}
		if p2.PerformanceOrder != 2 {
			t.Errorf("2件目の出演順が不正です: got=%d, want=2", p2.PerformanceOrder)
		}

		// start_time / end_time が正しく HH:MM 形式で返るか（バグ修正の核心）
		if p1.StartTime == nil || *p1.StartTime != "18:00" {
			t.Errorf("1件目の start_time が不正です: got=%v, want=18:00", p1.StartTime)
		}
		if p1.EndTime == nil || *p1.EndTime != "18:40" {
			t.Errorf("1件目の end_time が不正です: got=%v, want=18:40", p1.EndTime)
		}
		if p2.StartTime == nil || *p2.StartTime != "19:00" {
			t.Errorf("2件目の start_time が不正です: got=%v, want=19:00", p2.StartTime)
		}
		if p2.EndTime == nil || *p2.EndTime != "19:40" {
			t.Errorf("2件目の end_time が不正です: got=%v, want=19:40", p2.EndTime)
		}

		// band_name が設定されているか
		if p1.BandName == "" {
			t.Errorf("1件目の band_name が空です")
		}
		if p2.BandName == "" {
			t.Errorf("2件目の band_name が空です")
		}
	})

	// --- UpdatePerformance のテスト ---
	t.Run("UpdatePerformance", func(t *testing.T) {
		performances, err := s.ListPerformancesByEvent(event.ID)
		if err != nil || len(performances) == 0 {
			t.Fatal("パフォーマンス一覧の取得に失敗しました")
		}
		target := performances[0]

		newStart := "18:30"
		newEnd := "19:10"
		newOrder := 3

		updated, err := s.UpdatePerformance(event.ID, target.ID, org.ID, &newStart, &newEnd, &newOrder)
		if err != nil {
			t.Fatalf("UpdatePerformance が失敗しました: %v", err)
		}

		if updated.StartTime == nil || *updated.StartTime != "18:30" {
			t.Errorf("更新後の start_time が不正です: got=%v, want=18:30", updated.StartTime)
		}
		if updated.EndTime == nil || *updated.EndTime != "19:10" {
			t.Errorf("更新後の end_time が不正です: got=%v, want=19:10", updated.EndTime)
		}
		if updated.PerformanceOrder != 3 {
			t.Errorf("更新後の performance_order が不正です: got=%d, want=3", updated.PerformanceOrder)
		}
		if updated.BandName == "" {
			t.Errorf("更新後の band_name が空です")
		}
	})

	// --- UpdatePerformance: 権限エラーのテスト ---
	t.Run("UpdatePerformance_Forbidden", func(t *testing.T) {
		performances, err := s.ListPerformancesByEvent(event.ID)
		if err != nil || len(performances) == 0 {
			t.Fatal("パフォーマンス一覧の取得に失敗しました")
		}
		target := performances[0]

		newOrder := 99
		_, err = s.UpdatePerformance(event.ID, target.ID, perf.ID, nil, nil, &newOrder)
		if err == nil {
			t.Fatal("非オーナーによる更新が成功してしまいました")
		}
	})
}
