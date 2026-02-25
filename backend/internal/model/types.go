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

type CreateEventInput struct {
	OrganizerID   string
	Title         string
	Description   *string
	VenueName     string
	VenueAddress  string
	EventDate     string
	DoorsOpenTime string
	StartTime     string
	EndTime       *string
	TicketPrice   *int
	Capacity      *int
	Status        EventStatus
}

type UpdateEventInput struct {
	ID            string
	OrganizerID   string
	Title         *string
	Description   *string
	VenueName     *string
	VenueAddress  *string
	EventDate     *string
	DoorsOpenTime *string
	StartTime     *string
	EndTime       *string
	TicketPrice   *int
	Capacity      *int
	Status        *EventStatus
}

type ReservationStatus string

const (
	ReservationStatusReserved  ReservationStatus = "reserved"
	ReservationStatusCancelled ReservationStatus = "cancelled"
)

type Reservation struct {
	ID                string            `json:"id"`
	EventID           string            `json:"event_id"`
	UserID            string            `json:"user_id"`
	ReservationNumber string            `json:"reservation_number"`
	Status            ReservationStatus `json:"status"`
	ReservedAt        time.Time         `json:"reserved_at"`
	CancelledAt       *time.Time        `json:"cancelled_at"`
	CreatedAt         time.Time         `json:"created_at"`
	UpdatedAt         time.Time         `json:"updated_at"`
}

type ReservationWithUser struct {
	Reservation
	UserDisplayName string `json:"user_display_name"`
	UserEmail       string `json:"user_email"`
}
