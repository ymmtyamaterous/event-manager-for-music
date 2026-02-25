package store

import (
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/ymmtyamaterous/event-manager-for-music-api/internal/model"
)

type MemoryStore struct {
	mu          sync.RWMutex
	usersByID   map[string]model.User
	userByEmail map[string]string
	eventsByID  map[string]model.Event
}

func NewMemoryStore() *MemoryStore {
	s := &MemoryStore{
		usersByID:   map[string]model.User{},
		userByEmail: map[string]string{},
		eventsByID:  map[string]model.Event{},
	}
	s.seedEvents()
	return s
}

func (s *MemoryStore) CreateUser(user model.User) (model.User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	emailKey := strings.ToLower(strings.TrimSpace(user.Email))
	if _, exists := s.userByEmail[emailKey]; exists {
		return model.User{}, ErrConflict
	}

	now := nowInTokyo()
	user.ID = uuid.NewString()
	user.CreatedAt = now
	user.UpdatedAt = now

	s.usersByID[user.ID] = user
	s.userByEmail[emailKey] = user.ID

	return user, nil
}

func (s *MemoryStore) FindUserByEmail(email string) (model.User, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	id, ok := s.userByEmail[strings.ToLower(strings.TrimSpace(email))]
	if !ok {
		return model.User{}, false
	}

	u, exists := s.usersByID[id]
	return u, exists
}

func (s *MemoryStore) GetUserByID(id string) (model.User, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	u, ok := s.usersByID[id]
	return u, ok
}

func (s *MemoryStore) ListEvents(status string, search string) []model.Event {
	s.mu.RLock()
	defer s.mu.RUnlock()

	searchLower := strings.ToLower(strings.TrimSpace(search))
	result := make([]model.Event, 0, len(s.eventsByID))
	for _, event := range s.eventsByID {
		if status != "" && string(event.Status) != status {
			continue
		}

		if searchLower != "" {
			desc := ""
			if event.Description != nil {
				desc = *event.Description
			}
			target := strings.ToLower(event.Title + " " + event.VenueName + " " + desc)
			if !strings.Contains(target, searchLower) {
				continue
			}
		}

		result = append(result, event)
	}

	return result
}

func (s *MemoryStore) GetEventByID(id string) (model.Event, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	e, ok := s.eventsByID[id]
	return e, ok
}

func (s *MemoryStore) seedEvents() {
	now := nowInTokyo()
	ticketPrice1 := 3000
	ticketPrice2 := 3500
	cap1 := 200
	cap2 := 250
	cap3 := 150
	desc1 := "渋谷を舞台にした春の大型ライブイベント。ジャンルを超えたバンドが集結します。"
	desc2 := "新進気鋭バンド中心のナイトイベント。深夜帯ならではの熱量を体感できます。"
	desc3 := "アコースティック中心の落ち着いたイベント。初出演バンド枠も多数。"
	end1 := "22:00"
	end2 := "23:30"
	end3 := "20:30"

	for _, event := range []model.Event{
		{
			ID:            "evt-20260320",
			OrganizerID:   uuid.NewString(),
			Title:         "春の音楽祭 2026",
			Description:   &desc1,
			VenueName:     "渋谷 CLUB ASIA",
			VenueAddress:  "東京都渋谷区円山町1-8",
			EventDate:     "2026-03-20",
			DoorsOpenTime: "18:00",
			StartTime:     "19:00",
			EndTime:       &end1,
			TicketPrice:   &ticketPrice1,
			Capacity:      &cap1,
			Status:        model.EventStatusPublished,
			CreatedAt:     now,
			UpdatedAt:     now,
		},
		{
			ID:            "evt-20260410",
			OrganizerID:   uuid.NewString(),
			Title:         "NIGHT BEAT SESSION",
			Description:   &desc2,
			VenueName:     "新宿 LOFT",
			VenueAddress:  "東京都新宿区歌舞伎町1-12-9",
			EventDate:     "2026-04-10",
			DoorsOpenTime: "19:00",
			StartTime:     "20:00",
			EndTime:       &end2,
			TicketPrice:   &ticketPrice2,
			Capacity:      &cap2,
			Status:        model.EventStatusPublished,
			CreatedAt:     now,
			UpdatedAt:     now,
		},
		{
			ID:            "evt-20260502",
			OrganizerID:   uuid.NewString(),
			Title:         "Acoustic Harbor",
			Description:   &desc3,
			VenueName:     "横浜 Bay Hall",
			VenueAddress:  "神奈川県横浜市中区新山下3-4-17",
			EventDate:     "2026-05-02",
			DoorsOpenTime: "17:30",
			StartTime:     "18:30",
			EndTime:       &end3,
			TicketPrice:   nil,
			Capacity:      &cap3,
			Status:        model.EventStatusPublished,
			CreatedAt:     now,
			UpdatedAt:     now,
		},
	} {
		s.eventsByID[event.ID] = event
	}
}

func nowInTokyo() time.Time {
	loc, err := time.LoadLocation("Asia/Tokyo")
	if err != nil {
		return time.Now()
	}
	return time.Now().In(loc)
}
