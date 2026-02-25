package store

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgconn"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/ymmtyamaterous/event-manager-for-music-api/internal/model"
)

type PostgresStore struct {
	db *sql.DB
}

func NewPostgresStore(databaseURL string) (*PostgresStore, error) {
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("db接続に失敗しました: %w", err)
	}

	return &PostgresStore{db: db}, nil
}

func (s *PostgresStore) CreateUser(user model.User) (model.User, error) {
	const q = `
		INSERT INTO users (
			email, password_hash, first_name, last_name, display_name, user_type
		) VALUES (
			$1, $2, $3, $4, $5, $6
		)
		RETURNING id, email, password_hash, first_name, last_name, display_name, user_type, profile_image_path, created_at, updated_at
	`

	var created model.User
	var userType string
	var profileImagePath sql.NullString
	err := s.db.QueryRow(
		q,
		user.Email,
		user.PasswordHash,
		user.FirstName,
		user.LastName,
		user.DisplayName,
		string(user.UserType),
	).Scan(
		&created.ID,
		&created.Email,
		&created.PasswordHash,
		&created.FirstName,
		&created.LastName,
		&created.DisplayName,
		&userType,
		&profileImagePath,
		&created.CreatedAt,
		&created.UpdatedAt,
	)
	if err != nil {
		if isUniqueViolation(err) {
			return model.User{}, ErrConflict
		}
		return model.User{}, err
	}

	created.UserType = model.UserType(userType)
	if profileImagePath.Valid {
		v := profileImagePath.String
		created.ProfileImagePath = &v
	}

	return created, nil
}

func (s *PostgresStore) FindUserByEmail(email string) (model.User, bool) {
	const q = `
		SELECT id, email, password_hash, first_name, last_name, display_name, user_type, profile_image_path, created_at, updated_at
		FROM users
		WHERE email = $1
	`

	var user model.User
	var userType string
	var profileImagePath sql.NullString
	err := s.db.QueryRow(q, strings.TrimSpace(strings.ToLower(email))).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.FirstName,
		&user.LastName,
		&user.DisplayName,
		&userType,
		&profileImagePath,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return model.User{}, false
	}
	if err != nil {
		return model.User{}, false
	}

	user.UserType = model.UserType(userType)
	if profileImagePath.Valid {
		v := profileImagePath.String
		user.ProfileImagePath = &v
	}

	return user, true
}

func (s *PostgresStore) GetUserByID(id string) (model.User, bool) {
	const q = `
		SELECT id, email, password_hash, first_name, last_name, display_name, user_type, profile_image_path, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	var user model.User
	var userType string
	var profileImagePath sql.NullString
	err := s.db.QueryRow(q, id).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.FirstName,
		&user.LastName,
		&user.DisplayName,
		&userType,
		&profileImagePath,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return model.User{}, false
	}
	if err != nil {
		return model.User{}, false
	}

	user.UserType = model.UserType(userType)
	if profileImagePath.Valid {
		v := profileImagePath.String
		user.ProfileImagePath = &v
	}

	return user, true
}

func (s *PostgresStore) ListEvents(status string, search string) []model.Event {
	base := `
		SELECT id, organizer_id, title, description, venue_name, venue_address, event_date, doors_open_time, start_time, end_time, ticket_price, capacity, status, created_at, updated_at
		FROM events
		WHERE 1=1
	`

	args := make([]any, 0, 2)
	idx := 1

	if strings.TrimSpace(status) != "" {
		base += fmt.Sprintf(" AND status = $%d", idx)
		args = append(args, status)
		idx++
	}

	if strings.TrimSpace(search) != "" {
		base += fmt.Sprintf(" AND (title ILIKE $%d OR venue_name ILIKE $%d OR COALESCE(description, '') ILIKE $%d)", idx, idx, idx)
		args = append(args, "%"+strings.TrimSpace(search)+"%")
		idx++
	}

	base += " ORDER BY event_date ASC, start_time ASC"

	rows, err := s.db.Query(base, args...)
	if err != nil {
		return []model.Event{}
	}
	defer rows.Close()

	result := make([]model.Event, 0)
	for rows.Next() {
		event, ok := scanEvent(rows)
		if ok {
			result = append(result, event)
		}
	}

	return result
}

func (s *PostgresStore) GetEventByID(id string) (model.Event, bool) {
	const q = `
		SELECT id, organizer_id, title, description, venue_name, venue_address, event_date, doors_open_time, start_time, end_time, ticket_price, capacity, status, created_at, updated_at
		FROM events
		WHERE id = $1
	`

	row := s.db.QueryRow(q, id)
	event, ok := scanEvent(row)
	return event, ok
}

type eventScanner interface {
	Scan(dest ...any) error
}

func scanEvent(scanner eventScanner) (model.Event, bool) {
	var event model.Event
	var description sql.NullString
	var eventDate sql.NullTime
	var doorsOpenTime sql.NullTime
	var startTime sql.NullTime
	var endTime sql.NullTime
	var ticketPrice sql.NullInt32
	var capacity sql.NullInt32
	var status string

	err := scanner.Scan(
		&event.ID,
		&event.OrganizerID,
		&event.Title,
		&description,
		&event.VenueName,
		&event.VenueAddress,
		&eventDate,
		&doorsOpenTime,
		&startTime,
		&endTime,
		&ticketPrice,
		&capacity,
		&status,
		&event.CreatedAt,
		&event.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) || err != nil {
		return model.Event{}, false
	}

	if eventDate.Valid {
		event.EventDate = eventDate.Time.Format("2006-01-02")
	}
	if description.Valid {
		v := description.String
		event.Description = &v
	}
	if doorsOpenTime.Valid {
		event.DoorsOpenTime = doorsOpenTime.Time.Format("15:04")
	}
	if startTime.Valid {
		event.StartTime = startTime.Time.Format("15:04")
	}
	if endTime.Valid {
		formatted := endTime.Time.Format("15:04")
		event.EndTime = &formatted
	}
	if ticketPrice.Valid {
		v := int(ticketPrice.Int32)
		event.TicketPrice = &v
	}
	if capacity.Valid {
		v := int(capacity.Int32)
		event.Capacity = &v
	}
	event.Status = model.EventStatus(status)

	return event, true
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}
	return false
}
