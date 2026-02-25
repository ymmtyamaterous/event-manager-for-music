package store

import "github.com/ymmtyamaterous/event-manager-for-music-api/internal/model"

type Repository interface {
	CreateUser(user model.User) (model.User, error)
	FindUserByEmail(email string) (model.User, bool)
	GetUserByID(id string) (model.User, bool)
	UpdateUser(userID string, firstName string, lastName string, displayName string, email string) (model.User, error)
	ListEvents(status string, search string, organizerID string) []model.Event
	GetEventByID(id string) (model.Event, bool)
	CreateEvent(input model.CreateEventInput) (model.Event, error)
	UpdateEvent(input model.UpdateEventInput) (model.Event, error)
	DeleteEvent(eventID string, organizerID string) error
	CreateReservation(userID string, eventID string) (model.Reservation, error)
	ListReservationsByUser(userID string, status string) []model.Reservation
	ListReservationsByEvent(eventID string, organizerID string, status string, search string) ([]model.ReservationWithUser, error)
	CancelReservation(userID string, reservationID string) (model.Reservation, error)
	ListAnnouncementsByEvent(eventID string) ([]model.Announcement, error)
	CreateAnnouncement(eventID string, organizerID string, title string, content string) (model.Announcement, error)
	UpdateAnnouncement(eventID string, announcementID string, organizerID string, title string, content string) (model.Announcement, error)
	DeleteAnnouncement(eventID string, announcementID string, organizerID string) error
}
