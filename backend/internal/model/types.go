package model

import "time"

type UserType string

const (
	UserTypeAdmin     UserType = "admin"
	UserTypeOrganizer UserType = "organizer"
	UserTypePerformer UserType = "performer"
	UserTypeAudience  UserType = "audience"
)

type User struct {
	ID               string    `json:"id"`
	Email            string    `json:"email"`
	PasswordHash     string    `json:"-"`
	FirstName        string    `json:"first_name"`
	LastName         string    `json:"last_name"`
	DisplayName      string    `json:"display_name"`
	UserType         UserType  `json:"user_type"`
	ProfileImagePath *string   `json:"profile_image_path"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type EventStatus string

const (
	EventStatusDraft     EventStatus = "draft"
	EventStatusPublished EventStatus = "published"
	EventStatusCancelled EventStatus = "cancelled"
)

type Event struct {
	ID            string      `json:"id"`
	OrganizerID   string      `json:"organizer_id"`
	Title         string      `json:"title"`
	Description   *string     `json:"description"`
	VenueName     string      `json:"venue_name"`
	VenueAddress  string      `json:"venue_address"`
	EventDate     string      `json:"event_date"`
	DoorsOpenTime string      `json:"doors_open_time"`
	StartTime     string      `json:"start_time"`
	EndTime       *string     `json:"end_time"`
	TicketPrice   *int        `json:"ticket_price"`
	Capacity      *int        `json:"capacity"`
	Status        EventStatus `json:"status"`
	CreatedAt     time.Time   `json:"created_at"`
	UpdatedAt     time.Time   `json:"updated_at"`
}
