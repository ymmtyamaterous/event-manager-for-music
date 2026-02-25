package store

import (
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/ymmtyamaterous/event-manager-for-music-api/internal/model"
)

type MemoryStore struct {
	mu                sync.RWMutex
	usersByID         map[string]model.User
	userByEmail       map[string]string
	bandsByID         map[string]model.Band
	eventsByID        map[string]model.Event
	performancesByID  map[string]model.Performance
	reservationsByID  map[string]model.Reservation
	announcementsByID map[string]model.Announcement
	entriesByID       map[string]model.Entry
}

func NewMemoryStore() *MemoryStore {
	s := &MemoryStore{
		usersByID:         map[string]model.User{},
		userByEmail:       map[string]string{},
		bandsByID:         map[string]model.Band{},
		eventsByID:        map[string]model.Event{},
		performancesByID:  map[string]model.Performance{},
		reservationsByID:  map[string]model.Reservation{},
		announcementsByID: map[string]model.Announcement{},
		entriesByID:       map[string]model.Entry{},
	}
	s.seedEvents()
	return s
}

func (s *MemoryStore) ListPerformancesByEvent(eventID string) ([]model.Performance, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if _, exists := s.eventsByID[eventID]; !exists {
		return nil, ErrNotFound
	}

	result := make([]model.Performance, 0)
	for _, performance := range s.performancesByID {
		if performance.EventID == eventID {
			result = append(result, performance)
		}
	}

	sort.Slice(result, func(i, j int) bool {
		if result[i].PerformanceOrder == result[j].PerformanceOrder {
			return result[i].CreatedAt.Before(result[j].CreatedAt)
		}
		return result[i].PerformanceOrder < result[j].PerformanceOrder
	})

	return result, nil
}

func (s *MemoryStore) ListBandsByOwner(userID string) ([]model.Band, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]model.Band, 0)
	for _, band := range s.bandsByID {
		if band.OwnerID == userID {
			result = append(result, band)
		}
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].CreatedAt.After(result[j].CreatedAt)
	})

	return result, nil
}

func (s *MemoryStore) CreateBand(userID string, name string, genre string, description string) (model.Band, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	user, exists := s.usersByID[userID]
	if !exists {
		return model.Band{}, ErrNotFound
	}
	if user.UserType != model.UserTypePerformer {
		return model.Band{}, ErrForbidden
	}

	trimmedName := strings.TrimSpace(name)
	if trimmedName == "" {
		return model.Band{}, ErrConflict
	}

	now := nowInTokyo()
	band := model.Band{
		ID:        uuid.NewString(),
		OwnerID:   userID,
		Name:      trimmedName,
		CreatedAt: now,
		UpdatedAt: now,
	}

	trimmedGenre := strings.TrimSpace(genre)
	if trimmedGenre != "" {
		band.Genre = &trimmedGenre
	}

	trimmedDescription := strings.TrimSpace(description)
	if trimmedDescription != "" {
		band.Description = &trimmedDescription
	}

	s.bandsByID[band.ID] = band
	return band, nil
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

func (s *MemoryStore) UpdateUser(userID string, firstName string, lastName string, displayName string, email string) (model.User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	user, exists := s.usersByID[userID]
	if !exists {
		return model.User{}, ErrNotFound
	}

	newEmail := strings.ToLower(strings.TrimSpace(email))
	if newEmail == "" {
		newEmail = user.Email
	}

	if ownerID, exists := s.userByEmail[newEmail]; exists && ownerID != userID {
		return model.User{}, ErrConflict
	}

	delete(s.userByEmail, strings.ToLower(strings.TrimSpace(user.Email)))

	if strings.TrimSpace(firstName) != "" {
		user.FirstName = strings.TrimSpace(firstName)
	}
	if strings.TrimSpace(lastName) != "" {
		user.LastName = strings.TrimSpace(lastName)
	}
	if strings.TrimSpace(displayName) != "" {
		user.DisplayName = strings.TrimSpace(displayName)
	}
	user.Email = newEmail
	user.UpdatedAt = nowInTokyo()

	s.usersByID[userID] = user
	s.userByEmail[newEmail] = userID

	return user, nil
}

func (s *MemoryStore) ListEvents(status string, search string, organizerID string) []model.Event {
	s.mu.RLock()
	defer s.mu.RUnlock()

	searchLower := strings.ToLower(strings.TrimSpace(search))
	result := make([]model.Event, 0, len(s.eventsByID))
	for _, event := range s.eventsByID {
		if organizerID != "" && event.OrganizerID != organizerID {
			continue
		}

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

func (s *MemoryStore) CreateEvent(input model.CreateEventInput) (model.Event, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	owner, exists := s.usersByID[input.OrganizerID]
	if !exists {
		return model.Event{}, ErrNotFound
	}
	if owner.UserType != model.UserTypeOrganizer {
		return model.Event{}, ErrForbidden
	}

	now := nowInTokyo()
	event := model.Event{
		ID:            uuid.NewString(),
		OrganizerID:   input.OrganizerID,
		Title:         input.Title,
		Description:   input.Description,
		VenueName:     input.VenueName,
		VenueAddress:  input.VenueAddress,
		EventDate:     input.EventDate,
		DoorsOpenTime: input.DoorsOpenTime,
		StartTime:     input.StartTime,
		EndTime:       input.EndTime,
		TicketPrice:   input.TicketPrice,
		Capacity:      input.Capacity,
		Status:        input.Status,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	s.eventsByID[event.ID] = event
	return event, nil
}

func (s *MemoryStore) UpdateEvent(input model.UpdateEventInput) (model.Event, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	event, exists := s.eventsByID[input.ID]
	if !exists {
		return model.Event{}, ErrNotFound
	}
	if event.OrganizerID != input.OrganizerID {
		return model.Event{}, ErrForbidden
	}

	if input.Title != nil {
		event.Title = strings.TrimSpace(*input.Title)
	}
	if input.Description != nil {
		v := strings.TrimSpace(*input.Description)
		event.Description = &v
	}
	if input.VenueName != nil {
		event.VenueName = strings.TrimSpace(*input.VenueName)
	}
	if input.VenueAddress != nil {
		event.VenueAddress = strings.TrimSpace(*input.VenueAddress)
	}
	if input.EventDate != nil {
		event.EventDate = strings.TrimSpace(*input.EventDate)
	}
	if input.DoorsOpenTime != nil {
		event.DoorsOpenTime = strings.TrimSpace(*input.DoorsOpenTime)
	}
	if input.StartTime != nil {
		event.StartTime = strings.TrimSpace(*input.StartTime)
	}
	if input.EndTime != nil {
		v := strings.TrimSpace(*input.EndTime)
		event.EndTime = &v
	}
	if input.TicketPrice != nil {
		v := *input.TicketPrice
		event.TicketPrice = &v
	}
	if input.Capacity != nil {
		v := *input.Capacity
		event.Capacity = &v
	}
	if input.Status != nil {
		event.Status = *input.Status
	}

	event.UpdatedAt = nowInTokyo()
	s.eventsByID[event.ID] = event

	return event, nil
}

func (s *MemoryStore) DeleteEvent(eventID string, organizerID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	event, exists := s.eventsByID[eventID]
	if !exists {
		return ErrNotFound
	}
	if event.OrganizerID != organizerID {
		return ErrForbidden
	}

	delete(s.eventsByID, eventID)
	return nil
}

func (s *MemoryStore) GetEventByID(id string) (model.Event, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	e, ok := s.eventsByID[id]
	return e, ok
}

func (s *MemoryStore) CreateReservation(userID string, eventID string) (model.Reservation, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	user, userExists := s.usersByID[userID]
	if !userExists {
		return model.Reservation{}, ErrNotFound
	}
	if user.UserType != model.UserTypeAudience {
		return model.Reservation{}, ErrForbidden
	}

	event, eventExists := s.eventsByID[eventID]
	if !eventExists || event.Status != model.EventStatusPublished {
		return model.Reservation{}, ErrNotFound
	}

	for _, reservation := range s.reservationsByID {
		if reservation.EventID == eventID && reservation.UserID == userID && reservation.Status == model.ReservationStatusReserved {
			return model.Reservation{}, ErrConflict
		}
	}

	if event.Capacity != nil {
		reservedCount := 0
		for _, reservation := range s.reservationsByID {
			if reservation.EventID == eventID && reservation.Status == model.ReservationStatusReserved {
				reservedCount++
			}
		}
		if reservedCount >= *event.Capacity {
			return model.Reservation{}, ErrCapacityFull
		}
	}

	now := nowInTokyo()
	reservation := model.Reservation{
		ID:                uuid.NewString(),
		EventID:           eventID,
		UserID:            userID,
		ReservationNumber: generateReservationNumber(),
		Status:            model.ReservationStatusReserved,
		ReservedAt:        now,
		CreatedAt:         now,
		UpdatedAt:         now,
	}

	s.reservationsByID[reservation.ID] = reservation
	return reservation, nil
}

func (s *MemoryStore) ListReservationsByUser(userID string, status string) []model.Reservation {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]model.Reservation, 0)
	for _, reservation := range s.reservationsByID {
		if reservation.UserID != userID {
			continue
		}
		if status != "" && string(reservation.Status) != status {
			continue
		}
		result = append(result, reservation)
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].ReservedAt.After(result[j].ReservedAt)
	})

	return result
}

func (s *MemoryStore) ListReservationsByEvent(eventID string, organizerID string, status string, search string) ([]model.ReservationWithUser, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	event, exists := s.eventsByID[eventID]
	if !exists {
		return nil, ErrNotFound
	}
	if event.OrganizerID != organizerID {
		return nil, ErrForbidden
	}

	searchLower := strings.ToLower(strings.TrimSpace(search))
	result := make([]model.ReservationWithUser, 0)

	for _, reservation := range s.reservationsByID {
		if reservation.EventID != eventID {
			continue
		}
		if status != "" && string(reservation.Status) != status {
			continue
		}

		user, ok := s.usersByID[reservation.UserID]
		if !ok {
			continue
		}

		if searchLower != "" {
			target := strings.ToLower(reservation.ReservationNumber + " " + user.DisplayName + " " + user.Email)
			if !strings.Contains(target, searchLower) {
				continue
			}
		}

		result = append(result, model.ReservationWithUser{
			Reservation:     reservation,
			UserDisplayName: user.DisplayName,
			UserEmail:       user.Email,
		})
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].ReservedAt.After(result[j].ReservedAt)
	})

	return result, nil
}

func (s *MemoryStore) CancelReservation(userID string, reservationID string) (model.Reservation, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	reservation, exists := s.reservationsByID[reservationID]
	if !exists {
		return model.Reservation{}, ErrNotFound
	}
	if reservation.UserID != userID {
		return model.Reservation{}, ErrForbidden
	}
	if reservation.Status == model.ReservationStatusCancelled {
		return model.Reservation{}, ErrConflict
	}

	now := nowInTokyo()
	reservation.Status = model.ReservationStatusCancelled
	reservation.CancelledAt = &now
	reservation.UpdatedAt = now

	s.reservationsByID[reservation.ID] = reservation
	return reservation, nil
}

func (s *MemoryStore) ListAnnouncementsByEvent(eventID string) ([]model.Announcement, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if _, exists := s.eventsByID[eventID]; !exists {
		return nil, ErrNotFound
	}

	result := make([]model.Announcement, 0)
	for _, announcement := range s.announcementsByID {
		if announcement.EventID == eventID {
			result = append(result, announcement)
		}
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].PublishedAt.After(result[j].PublishedAt)
	})

	return result, nil
}

func (s *MemoryStore) CreateAnnouncement(eventID string, organizerID string, title string, content string) (model.Announcement, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	event, exists := s.eventsByID[eventID]
	if !exists {
		return model.Announcement{}, ErrNotFound
	}
	if event.OrganizerID != organizerID {
		return model.Announcement{}, ErrForbidden
	}

	now := nowInTokyo()
	announcement := model.Announcement{
		ID:          uuid.NewString(),
		EventID:     eventID,
		Title:       strings.TrimSpace(title),
		Content:     strings.TrimSpace(content),
		PublishedAt: now,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	s.announcementsByID[announcement.ID] = announcement
	return announcement, nil
}

func (s *MemoryStore) UpdateAnnouncement(eventID string, announcementID string, organizerID string, title string, content string) (model.Announcement, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	event, exists := s.eventsByID[eventID]
	if !exists {
		return model.Announcement{}, ErrNotFound
	}
	if event.OrganizerID != organizerID {
		return model.Announcement{}, ErrForbidden
	}

	announcement, exists := s.announcementsByID[announcementID]
	if !exists || announcement.EventID != eventID {
		return model.Announcement{}, ErrNotFound
	}

	announcement.Title = strings.TrimSpace(title)
	announcement.Content = strings.TrimSpace(content)
	announcement.UpdatedAt = nowInTokyo()

	s.announcementsByID[announcementID] = announcement
	return announcement, nil
}

func (s *MemoryStore) DeleteAnnouncement(eventID string, announcementID string, organizerID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	event, exists := s.eventsByID[eventID]
	if !exists {
		return ErrNotFound
	}
	if event.OrganizerID != organizerID {
		return ErrForbidden
	}

	announcement, exists := s.announcementsByID[announcementID]
	if !exists || announcement.EventID != eventID {
		return ErrNotFound
	}

	delete(s.announcementsByID, announcementID)
	return nil
}

func (s *MemoryStore) ListEntriesByEvent(eventID string, organizerID string, status string) ([]model.EntryWithBand, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	event, exists := s.eventsByID[eventID]
	if !exists {
		return nil, ErrNotFound
	}
	if event.OrganizerID != organizerID {
		return nil, ErrForbidden
	}

	result := make([]model.EntryWithBand, 0)
	for _, entry := range s.entriesByID {
		if entry.EventID != eventID {
			continue
		}
		if strings.TrimSpace(status) != "" && string(entry.Status) != strings.TrimSpace(status) {
			continue
		}
		result = append(result, model.EntryWithBand{
			Entry:    entry,
			BandName: s.bandNameByID(entry.BandID),
		})
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].CreatedAt.After(result[j].CreatedAt)
	})

	return result, nil
}

func (s *MemoryStore) ListEntriesByBand(bandID string, userID string, status string) ([]model.EntryWithEvent, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	band, exists := s.bandsByID[bandID]
	if !exists {
		return nil, ErrNotFound
	}
	if band.OwnerID != userID {
		return nil, ErrForbidden
	}

	result := make([]model.EntryWithEvent, 0)
	for _, entry := range s.entriesByID {
		if entry.BandID != bandID {
			continue
		}
		if strings.TrimSpace(status) != "" && string(entry.Status) != strings.TrimSpace(status) {
			continue
		}
		event, exists := s.eventsByID[entry.EventID]
		if !exists {
			continue
		}

		result = append(result, model.EntryWithEvent{
			Entry:      entry,
			EventTitle: event.Title,
			EventDate:  event.EventDate,
			VenueName:  event.VenueName,
		})
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].CreatedAt.After(result[j].CreatedAt)
	})

	return result, nil
}

func (s *MemoryStore) CreateEntry(eventID string, userID string, bandID string, message string) (model.Entry, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	user, exists := s.usersByID[userID]
	if !exists {
		return model.Entry{}, ErrNotFound
	}
	if user.UserType != model.UserTypePerformer {
		return model.Entry{}, ErrForbidden
	}

	event, exists := s.eventsByID[eventID]
	if !exists || event.Status != model.EventStatusPublished {
		return model.Entry{}, ErrNotFound
	}

	band, exists := s.bandsByID[strings.TrimSpace(bandID)]
	if !exists {
		return model.Entry{}, ErrNotFound
	}
	if band.OwnerID != userID {
		return model.Entry{}, ErrForbidden
	}

	for _, existing := range s.entriesByID {
		if existing.EventID == eventID && existing.BandID == strings.TrimSpace(bandID) {
			return model.Entry{}, ErrConflict
		}
	}

	now := nowInTokyo()
	trimmedMessage := strings.TrimSpace(message)
	var messagePtr *string
	if trimmedMessage != "" {
		messagePtr = &trimmedMessage
	}

	entry := model.Entry{
		ID:        uuid.NewString(),
		EventID:   eventID,
		BandID:    strings.TrimSpace(bandID),
		Status:    model.EntryStatusPending,
		Message:   messagePtr,
		CreatedAt: now,
		UpdatedAt: now,
	}

	s.entriesByID[entry.ID] = entry
	return entry, nil
}

func (s *MemoryStore) ApproveEntry(entryID string, organizerID string, startTime *string, endTime *string, performanceOrder *int) (model.Entry, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	entry, exists := s.entriesByID[entryID]
	if !exists {
		return model.Entry{}, ErrNotFound
	}

	event, exists := s.eventsByID[entry.EventID]
	if !exists {
		return model.Entry{}, ErrNotFound
	}
	if event.OrganizerID != organizerID {
		return model.Entry{}, ErrForbidden
	}

	entry.Status = model.EntryStatusApproved
	entry.RejectionReason = nil
	now := nowInTokyo()
	entry.UpdatedAt = now

	s.entriesByID[entry.ID] = entry

	for _, performance := range s.performancesByID {
		if performance.EventID == entry.EventID && performance.BandID == entry.BandID {
			return entry, nil
		}
	}

	order := 1
	if performanceOrder != nil && *performanceOrder > 0 {
		order = *performanceOrder
	} else {
		maxOrder := 0
		for _, performance := range s.performancesByID {
			if performance.EventID == entry.EventID && performance.PerformanceOrder > maxOrder {
				maxOrder = performance.PerformanceOrder
			}
		}
		order = maxOrder + 1
	}

	var normalizedStartTime *string
	if startTime != nil {
		v := strings.TrimSpace(*startTime)
		if v != "" {
			normalizedStartTime = &v
		}
	}

	var normalizedEndTime *string
	if endTime != nil {
		v := strings.TrimSpace(*endTime)
		if v != "" {
			normalizedEndTime = &v
		}
	}

	performance := model.Performance{
		ID:               uuid.NewString(),
		EventID:          entry.EventID,
		BandID:           entry.BandID,
		BandName:         s.bandNameByID(entry.BandID),
		StartTime:        normalizedStartTime,
		EndTime:          normalizedEndTime,
		PerformanceOrder: order,
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	s.performancesByID[performance.ID] = performance
	return entry, nil
}

func (s *MemoryStore) RejectEntry(entryID string, organizerID string, rejectionReason string) (model.Entry, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	entry, exists := s.entriesByID[entryID]
	if !exists {
		return model.Entry{}, ErrNotFound
	}

	event, exists := s.eventsByID[entry.EventID]
	if !exists {
		return model.Entry{}, ErrNotFound
	}
	if event.OrganizerID != organizerID {
		return model.Entry{}, ErrForbidden
	}

	reason := strings.TrimSpace(rejectionReason)
	if reason == "" {
		return model.Entry{}, ErrConflict
	}

	entry.Status = model.EntryStatusRejected
	entry.RejectionReason = &reason
	entry.UpdatedAt = nowInTokyo()

	s.entriesByID[entry.ID] = entry
	return entry, nil
}

func (s *MemoryStore) bandNameByID(bandID string) string {
	band, exists := s.bandsByID[bandID]
	if !exists {
		return "(不明なバンド)"
	}
	return band.Name
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

func generateReservationNumber() string {
	return fmt.Sprintf("RES%d", time.Now().UnixMilli())
}
