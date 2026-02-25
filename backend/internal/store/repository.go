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
	CreateReservation(userID string, eventID string) (model.Reservation, error)
	ListReservationsByUser(userID string, status string) []model.Reservation
	CancelReservation(userID string, reservationID string) (model.Reservation, error)
}
