package store

import "github.com/ymmtyamaterous/event-manager-for-music-api/internal/model"

type Repository interface {
	CreateUser(user model.User) (model.User, error)
	FindUserByEmail(email string) (model.User, bool)
	GetUserByID(id string) (model.User, bool)
	UpdateUser(userID string, firstName string, lastName string, displayName string, email string) (model.User, error)
	UpdateUserProfileImage(userID string, path string) (model.User, error)
	ListBandsByOwner(userID string) ([]model.Band, error)
	CreateBand(userID string, name string, genre string, description string) (model.Band, error)
	UpdateBand(bandID string, userID string, name *string, genre *string, description *string, formedYear *int, twitterURL *string) (model.Band, error)
	UpdateBandProfileImage(bandID string, userID string, path string) (model.Band, error)
	ListBandMembers(bandID string, userID string) ([]model.BandMember, error)
	ReplaceBandMembers(bandID string, userID string, members []model.BandMember) ([]model.BandMember, error)
	ListSetlists(bandID string, userID string) ([]model.Setlist, error)
	CreateSetlist(bandID string, userID string, title string, artist *string, displayOrder int) (model.Setlist, error)
	DeleteSetlist(bandID string, setlistID string, userID string) error
	ListPerformancesByEvent(eventID string) ([]model.Performance, error)
	UpdatePerformance(eventID string, performanceID string, organizerID string, startTime *string, endTime *string, performanceOrder *int) (model.Performance, error)
	DeletePerformance(eventID string, performanceID string, organizerID string) error
	ListEvents(status string, search string, organizerID string) []model.Event
	GetEventByID(id string) (model.Event, bool)
	CreateEvent(input model.CreateEventInput) (model.Event, error)
	UpdateEvent(input model.UpdateEventInput) (model.Event, error)
	UpdateEventFlyerImage(eventID string, organizerID string, path string) (model.Event, error)
	DeleteEvent(eventID string, organizerID string) error
	CreateReservation(userID string, eventID string) (model.Reservation, error)
	ListReservationsByUser(userID string, status string) []model.Reservation
	ListReservationsByEvent(eventID string, organizerID string, status string, search string) ([]model.ReservationWithUser, error)
	CancelReservation(userID string, reservationID string) (model.Reservation, error)
	ListAnnouncementsByEvent(eventID string) ([]model.Announcement, error)
	CreateAnnouncement(eventID string, organizerID string, title string, content string) (model.Announcement, error)
	UpdateAnnouncement(eventID string, announcementID string, organizerID string, title string, content string) (model.Announcement, error)
	DeleteAnnouncement(eventID string, announcementID string, organizerID string) error
	ListEntriesByEvent(eventID string, organizerID string, status string) ([]model.EntryWithBand, error)
	ListEntriesByBand(bandID string, userID string, status string) ([]model.EntryWithEvent, error)
	CreateEntry(eventID string, userID string, bandID string, message string) (model.Entry, error)
	ApproveEntry(entryID string, organizerID string, startTime *string, endTime *string, performanceOrder *int) (model.Entry, error)
	RejectEntry(entryID string, organizerID string, rejectionReason string) (model.Entry, error)
}
