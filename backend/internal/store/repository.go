package store

import "github.com/ymmtyamaterous/event-manager-for-music-api/internal/model"

type Repository interface {
	CreateUser(user model.User) (model.User, error)
	FindUserByEmail(email string) (model.User, bool)
	GetUserByID(id string) (model.User, bool)
	ListEvents(status string, search string) []model.Event
	GetEventByID(id string) (model.Event, bool)
}
