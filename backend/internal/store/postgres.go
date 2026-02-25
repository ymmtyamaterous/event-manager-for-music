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

func (s *PostgresStore) UpdateUser(userID string, firstName string, lastName string, displayName string, email string) (model.User, error) {
	const q = `
		UPDATE users
		SET
			first_name = CASE WHEN $2 <> '' THEN $2 ELSE first_name END,
			last_name = CASE WHEN $3 <> '' THEN $3 ELSE last_name END,
			display_name = CASE WHEN $4 <> '' THEN $4 ELSE display_name END,
			email = CASE WHEN $5 <> '' THEN $5 ELSE email END,
			updated_at = NOW()
		WHERE id = $1
		RETURNING id, email, password_hash, first_name, last_name, display_name, user_type, profile_image_path, created_at, updated_at
	`

	var user model.User
	var userType string
	var profileImagePath sql.NullString
	err := s.db.QueryRow(
		q,
		userID,
		strings.TrimSpace(firstName),
		strings.TrimSpace(lastName),
		strings.TrimSpace(displayName),
		strings.ToLower(strings.TrimSpace(email)),
	).Scan(
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
		return model.User{}, ErrNotFound
	}
	if err != nil {
		if isUniqueViolation(err) {
			return model.User{}, ErrConflict
		}
		return model.User{}, err
	}

	user.UserType = model.UserType(userType)
	if profileImagePath.Valid {
		v := profileImagePath.String
		user.ProfileImagePath = &v
	}

	return user, nil
}

func (s *PostgresStore) ListEvents(status string, search string, organizerID string) []model.Event {
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

	if strings.TrimSpace(organizerID) != "" {
		base += fmt.Sprintf(" AND organizer_id = $%d", idx)
		args = append(args, organizerID)
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

func (s *PostgresStore) CreateEvent(input model.CreateEventInput) (model.Event, error) {
	const q = `
		INSERT INTO events (
			organizer_id, title, description, venue_name, venue_address, event_date, doors_open_time, start_time, end_time, ticket_price, capacity, status
		) VALUES (
			$1, $2, $3, $4, $5, $6::date, $7::time, $8::time, $9::time, $10, $11, $12
		)
		RETURNING id, organizer_id, title, description, venue_name, venue_address, event_date, doors_open_time, start_time, end_time, ticket_price, capacity, status, created_at, updated_at
	`

	event, ok := scanEvent(s.db.QueryRow(
		q,
		input.OrganizerID,
		input.Title,
		input.Description,
		input.VenueName,
		input.VenueAddress,
		input.EventDate,
		input.DoorsOpenTime,
		input.StartTime,
		input.EndTime,
		input.TicketPrice,
		input.Capacity,
		string(input.Status),
	))
	if !ok {
		return model.Event{}, ErrNotFound
	}

	return event, nil
}

func (s *PostgresStore) UpdateEvent(input model.UpdateEventInput) (model.Event, error) {
	var currentOwnerID string
	err := s.db.QueryRow(`SELECT organizer_id FROM events WHERE id = $1`, input.ID).Scan(&currentOwnerID)
	if errors.Is(err, sql.ErrNoRows) {
		return model.Event{}, ErrNotFound
	}
	if err != nil {
		return model.Event{}, err
	}
	if currentOwnerID != input.OrganizerID {
		return model.Event{}, ErrForbidden
	}

	const q = `
		UPDATE events
		SET
			title = COALESCE(NULLIF($2, ''), title),
			description = CASE WHEN $3 IS NULL THEN description ELSE $3 END,
			venue_name = COALESCE(NULLIF($4, ''), venue_name),
			venue_address = COALESCE(NULLIF($5, ''), venue_address),
			event_date = COALESCE(NULLIF($6, '')::date, event_date),
			doors_open_time = COALESCE(NULLIF($7, '')::time, doors_open_time),
			start_time = COALESCE(NULLIF($8, '')::time, start_time),
			end_time = CASE WHEN $9 IS NULL OR $9 = '' THEN end_time ELSE $9::time END,
			ticket_price = COALESCE($10, ticket_price),
			capacity = COALESCE($11, capacity),
			status = COALESCE(NULLIF($12, '')::event_status, status),
			updated_at = NOW()
		WHERE id = $1
		RETURNING id, organizer_id, title, description, venue_name, venue_address, event_date, doors_open_time, start_time, end_time, ticket_price, capacity, status, created_at, updated_at
	`

	event, ok := scanEvent(s.db.QueryRow(
		q,
		input.ID,
		stringOrNil(input.Title),
		stringOrNil(input.Description),
		stringOrNil(input.VenueName),
		stringOrNil(input.VenueAddress),
		stringOrNil(input.EventDate),
		stringOrNil(input.DoorsOpenTime),
		stringOrNil(input.StartTime),
		stringOrNil(input.EndTime),
		input.TicketPrice,
		input.Capacity,
		statusOrNil(input.Status),
	))
	if !ok {
		return model.Event{}, ErrNotFound
	}

	return event, nil
}

func (s *PostgresStore) DeleteEvent(eventID string, organizerID string) error {
	result, err := s.db.Exec(`DELETE FROM events WHERE id = $1 AND organizer_id = $2`, eventID, organizerID)
	if err != nil {
		return err
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		if _, exists := s.GetEventByID(eventID); !exists {
			return ErrNotFound
		}
		return ErrForbidden
	}

	return nil
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

func (s *PostgresStore) CreateReservation(userID string, eventID string) (model.Reservation, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return model.Reservation{}, err
	}
	defer tx.Rollback()

	var userType string
	err = tx.QueryRow(`SELECT user_type FROM users WHERE id = $1`, userID).Scan(&userType)
	if errors.Is(err, sql.ErrNoRows) {
		return model.Reservation{}, ErrNotFound
	}
	if err != nil {
		return model.Reservation{}, err
	}
	if userType != string(model.UserTypeAudience) {
		return model.Reservation{}, ErrForbidden
	}

	var capacity sql.NullInt32
	err = tx.QueryRow(`SELECT capacity FROM events WHERE id = $1 AND status = 'published'`, eventID).Scan(&capacity)
	if errors.Is(err, sql.ErrNoRows) {
		return model.Reservation{}, ErrNotFound
	}
	if err != nil {
		return model.Reservation{}, err
	}

	var duplicatedCount int
	err = tx.QueryRow(
		`SELECT COUNT(*) FROM reservations WHERE event_id = $1 AND user_id = $2 AND status = 'reserved'`,
		eventID,
		userID,
	).Scan(&duplicatedCount)
	if err != nil {
		return model.Reservation{}, err
	}
	if duplicatedCount > 0 {
		return model.Reservation{}, ErrConflict
	}

	if capacity.Valid {
		var reservedCount int
		err = tx.QueryRow(
			`SELECT COUNT(*) FROM reservations WHERE event_id = $1 AND status = 'reserved'`,
			eventID,
		).Scan(&reservedCount)
		if err != nil {
			return model.Reservation{}, err
		}
		if reservedCount >= int(capacity.Int32) {
			return model.Reservation{}, ErrCapacityFull
		}
	}

	reservationNumber := generateReservationNumber()
	const q = `
		INSERT INTO reservations (event_id, user_id, reservation_number, status)
		VALUES ($1, $2, $3, 'reserved')
		RETURNING id, event_id, user_id, reservation_number, status, reserved_at, cancelled_at, created_at, updated_at
	`

	var reservation model.Reservation
	var status string
	var cancelledAt sql.NullTime
	err = tx.QueryRow(q, eventID, userID, reservationNumber).Scan(
		&reservation.ID,
		&reservation.EventID,
		&reservation.UserID,
		&reservation.ReservationNumber,
		&status,
		&reservation.ReservedAt,
		&cancelledAt,
		&reservation.CreatedAt,
		&reservation.UpdatedAt,
	)
	if err != nil {
		if isUniqueViolation(err) {
			return model.Reservation{}, ErrConflict
		}
		return model.Reservation{}, err
	}

	reservation.Status = model.ReservationStatus(status)
	if cancelledAt.Valid {
		v := cancelledAt.Time
		reservation.CancelledAt = &v
	}

	if err := tx.Commit(); err != nil {
		return model.Reservation{}, err
	}

	return reservation, nil
}

func (s *PostgresStore) ListReservationsByUser(userID string, status string) []model.Reservation {
	base := `
		SELECT id, event_id, user_id, reservation_number, status, reserved_at, cancelled_at, created_at, updated_at
		FROM reservations
		WHERE user_id = $1
	`

	args := []any{userID}
	if strings.TrimSpace(status) != "" {
		base += " AND status = $2"
		args = append(args, status)
	}

	base += " ORDER BY reserved_at DESC"

	rows, err := s.db.Query(base, args...)
	if err != nil {
		return []model.Reservation{}
	}
	defer rows.Close()

	result := make([]model.Reservation, 0)
	for rows.Next() {
		reservation, ok := scanReservation(rows)
		if ok {
			result = append(result, reservation)
		}
	}

	return result
}

func (s *PostgresStore) ListReservationsByEvent(eventID string, organizerID string, status string, search string) ([]model.ReservationWithUser, error) {
	var ownerID string
	err := s.db.QueryRow(`SELECT organizer_id FROM events WHERE id = $1`, eventID).Scan(&ownerID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if ownerID != organizerID {
		return nil, ErrForbidden
	}

	base := `
		SELECT
			r.id,
			r.event_id,
			r.user_id,
			r.reservation_number,
			r.status,
			r.reserved_at,
			r.cancelled_at,
			r.created_at,
			r.updated_at,
			u.display_name,
			u.email
		FROM reservations r
		INNER JOIN users u ON u.id = r.user_id
		WHERE r.event_id = $1
	`

	args := []any{eventID}
	idx := 2

	if strings.TrimSpace(status) != "" {
		base += fmt.Sprintf(" AND r.status = $%d", idx)
		args = append(args, strings.TrimSpace(status))
		idx++
	}

	if strings.TrimSpace(search) != "" {
		base += fmt.Sprintf(" AND (r.reservation_number ILIKE $%d OR u.display_name ILIKE $%d OR u.email ILIKE $%d)", idx, idx, idx)
		args = append(args, "%"+strings.TrimSpace(search)+"%")
		idx++
	}

	base += " ORDER BY r.reserved_at DESC"

	rows, err := s.db.Query(base, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]model.ReservationWithUser, 0)
	for rows.Next() {
		item, ok := scanReservationWithUser(rows)
		if ok {
			result = append(result, item)
		}
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return result, nil
}

func (s *PostgresStore) CancelReservation(userID string, reservationID string) (model.Reservation, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return model.Reservation{}, err
	}
	defer tx.Rollback()

	var ownerID string
	var status string
	err = tx.QueryRow(`SELECT user_id, status FROM reservations WHERE id = $1`, reservationID).Scan(&ownerID, &status)
	if errors.Is(err, sql.ErrNoRows) {
		return model.Reservation{}, ErrNotFound
	}
	if err != nil {
		return model.Reservation{}, err
	}
	if ownerID != userID {
		return model.Reservation{}, ErrForbidden
	}
	if status == string(model.ReservationStatusCancelled) {
		return model.Reservation{}, ErrConflict
	}

	const q = `
		UPDATE reservations
		SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
		WHERE id = $1
		RETURNING id, event_id, user_id, reservation_number, status, reserved_at, cancelled_at, created_at, updated_at
	`

	reservation, ok := scanReservation(tx.QueryRow(q, reservationID))
	if !ok {
		return model.Reservation{}, errors.New("予約キャンセルに失敗しました")
	}

	if err := tx.Commit(); err != nil {
		return model.Reservation{}, err
	}

	return reservation, nil
}

func (s *PostgresStore) ListAnnouncementsByEvent(eventID string) ([]model.Announcement, error) {
	var exists bool
	err := s.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM events WHERE id = $1)`, eventID).Scan(&exists)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrNotFound
	}

	const q = `
		SELECT id, event_id, title, content, published_at, created_at, updated_at
		FROM announcements
		WHERE event_id = $1
		ORDER BY published_at DESC
	`

	rows, err := s.db.Query(q, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]model.Announcement, 0)
	for rows.Next() {
		announcement, ok := scanAnnouncement(rows)
		if ok {
			result = append(result, announcement)
		}
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return result, nil
}

func (s *PostgresStore) CreateAnnouncement(eventID string, organizerID string, title string, content string) (model.Announcement, error) {
	var ownerID string
	err := s.db.QueryRow(`SELECT organizer_id FROM events WHERE id = $1`, eventID).Scan(&ownerID)
	if errors.Is(err, sql.ErrNoRows) {
		return model.Announcement{}, ErrNotFound
	}
	if err != nil {
		return model.Announcement{}, err
	}
	if ownerID != organizerID {
		return model.Announcement{}, ErrForbidden
	}

	const q = `
		INSERT INTO announcements (event_id, title, content)
		VALUES ($1, $2, $3)
		RETURNING id, event_id, title, content, published_at, created_at, updated_at
	`

	announcement, ok := scanAnnouncement(s.db.QueryRow(q, eventID, strings.TrimSpace(title), strings.TrimSpace(content)))
	if !ok {
		return model.Announcement{}, errors.New("お知らせ作成に失敗しました")
	}

	return announcement, nil
}

func (s *PostgresStore) UpdateAnnouncement(eventID string, announcementID string, organizerID string, title string, content string) (model.Announcement, error) {
	var ownerID string
	err := s.db.QueryRow(`SELECT organizer_id FROM events WHERE id = $1`, eventID).Scan(&ownerID)
	if errors.Is(err, sql.ErrNoRows) {
		return model.Announcement{}, ErrNotFound
	}
	if err != nil {
		return model.Announcement{}, err
	}
	if ownerID != organizerID {
		return model.Announcement{}, ErrForbidden
	}

	const q = `
		UPDATE announcements
		SET title = $1, content = $2, updated_at = NOW()
		WHERE id = $3 AND event_id = $4
		RETURNING id, event_id, title, content, published_at, created_at, updated_at
	`

	announcement, ok := scanAnnouncement(
		s.db.QueryRow(
			q,
			strings.TrimSpace(title),
			strings.TrimSpace(content),
			announcementID,
			eventID,
		),
	)
	if !ok {
		return model.Announcement{}, ErrNotFound
	}

	return announcement, nil
}

func (s *PostgresStore) DeleteAnnouncement(eventID string, announcementID string, organizerID string) error {
	var ownerID string
	err := s.db.QueryRow(`SELECT organizer_id FROM events WHERE id = $1`, eventID).Scan(&ownerID)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if ownerID != organizerID {
		return ErrForbidden
	}

	result, err := s.db.Exec(`DELETE FROM announcements WHERE id = $1 AND event_id = $2`, announcementID, eventID)
	if err != nil {
		return err
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return ErrNotFound
	}

	return nil
}

func (s *PostgresStore) ListEntriesByEvent(eventID string, organizerID string, status string) ([]model.EntryWithBand, error) {
	var ownerID string
	err := s.db.QueryRow(`SELECT organizer_id FROM events WHERE id = $1`, eventID).Scan(&ownerID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if ownerID != organizerID {
		return nil, ErrForbidden
	}

	base := `
		SELECT
			e.id,
			e.event_id,
			e.band_id,
			e.status,
			e.message,
			e.rejection_reason,
			e.created_at,
			e.updated_at,
			b.name
		FROM entries e
		INNER JOIN bands b ON b.id = e.band_id
		WHERE e.event_id = $1
	`

	args := []any{eventID}
	if strings.TrimSpace(status) != "" {
		base += " AND e.status = $2"
		args = append(args, strings.TrimSpace(status))
	}

	base += " ORDER BY e.created_at DESC"

	rows, err := s.db.Query(base, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]model.EntryWithBand, 0)
	for rows.Next() {
		item, ok := scanEntryWithBand(rows)
		if ok {
			result = append(result, item)
		}
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return result, nil
}

func (s *PostgresStore) CreateEntry(eventID string, userID string, bandID string, message string) (model.Entry, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return model.Entry{}, err
	}
	defer tx.Rollback()

	var userType string
	err = tx.QueryRow(`SELECT user_type FROM users WHERE id = $1`, userID).Scan(&userType)
	if errors.Is(err, sql.ErrNoRows) {
		return model.Entry{}, ErrNotFound
	}
	if err != nil {
		return model.Entry{}, err
	}
	if userType != string(model.UserTypePerformer) {
		return model.Entry{}, ErrForbidden
	}

	var bandExists bool
	err = tx.QueryRow(`SELECT EXISTS(SELECT 1 FROM bands WHERE id = $1 AND owner_id = $2)`, bandID, userID).Scan(&bandExists)
	if err != nil {
		return model.Entry{}, err
	}
	if !bandExists {
		return model.Entry{}, ErrForbidden
	}

	var eventExists bool
	err = tx.QueryRow(`SELECT EXISTS(SELECT 1 FROM events WHERE id = $1 AND status = 'published')`, eventID).Scan(&eventExists)
	if err != nil {
		return model.Entry{}, err
	}
	if !eventExists {
		return model.Entry{}, ErrNotFound
	}

	trimmedMessage := strings.TrimSpace(message)
	var messageArg any
	if trimmedMessage == "" {
		messageArg = nil
	} else {
		messageArg = trimmedMessage
	}

	const q = `
		INSERT INTO entries (event_id, band_id, status, message)
		VALUES ($1, $2, 'pending', $3)
		RETURNING id, event_id, band_id, status, message, rejection_reason, created_at, updated_at
	`

	entry, ok := scanEntry(tx.QueryRow(q, eventID, bandID, messageArg))
	if !ok {
		return model.Entry{}, ErrConflict
	}

	if err := tx.Commit(); err != nil {
		if isUniqueViolation(err) {
			return model.Entry{}, ErrConflict
		}
		return model.Entry{}, err
	}

	return entry, nil
}

func (s *PostgresStore) ApproveEntry(entryID string, organizerID string) (model.Entry, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return model.Entry{}, err
	}
	defer tx.Rollback()

	var ownerID string
	var currentStatus string
	err = tx.QueryRow(
		`SELECT ev.organizer_id, e.status FROM entries e INNER JOIN events ev ON ev.id = e.event_id WHERE e.id = $1`,
		entryID,
	).Scan(&ownerID, &currentStatus)
	if errors.Is(err, sql.ErrNoRows) {
		return model.Entry{}, ErrNotFound
	}
	if err != nil {
		return model.Entry{}, err
	}
	if ownerID != organizerID {
		return model.Entry{}, ErrForbidden
	}
	if currentStatus == string(model.EntryStatusApproved) {
		return model.Entry{}, ErrConflict
	}

	const updateQ = `
		UPDATE entries
		SET status = 'approved', rejection_reason = NULL, updated_at = NOW()
		WHERE id = $1
		RETURNING id, event_id, band_id, status, message, rejection_reason, created_at, updated_at
	`

	entry, ok := scanEntry(tx.QueryRow(updateQ, entryID))
	if !ok {
		return model.Entry{}, ErrNotFound
	}

	const perfQ = `
		INSERT INTO performances (event_id, band_id, performance_order)
		SELECT $1, $2, COALESCE(MAX(performance_order), 0) + 1
		FROM performances
		WHERE event_id = $1
		ON CONFLICT (event_id, band_id) DO NOTHING
	`

	if _, err := tx.Exec(perfQ, entry.EventID, entry.BandID); err != nil {
		return model.Entry{}, err
	}

	if err := tx.Commit(); err != nil {
		return model.Entry{}, err
	}

	return entry, nil
}

func (s *PostgresStore) RejectEntry(entryID string, organizerID string, rejectionReason string) (model.Entry, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return model.Entry{}, err
	}
	defer tx.Rollback()

	var ownerID string
	err = tx.QueryRow(
		`SELECT ev.organizer_id FROM entries e INNER JOIN events ev ON ev.id = e.event_id WHERE e.id = $1`,
		entryID,
	).Scan(&ownerID)
	if errors.Is(err, sql.ErrNoRows) {
		return model.Entry{}, ErrNotFound
	}
	if err != nil {
		return model.Entry{}, err
	}
	if ownerID != organizerID {
		return model.Entry{}, ErrForbidden
	}

	const updateQ = `
		UPDATE entries
		SET status = 'rejected', rejection_reason = $2, updated_at = NOW()
		WHERE id = $1
		RETURNING id, event_id, band_id, status, message, rejection_reason, created_at, updated_at
	`

	entry, ok := scanEntry(tx.QueryRow(updateQ, entryID, strings.TrimSpace(rejectionReason)))
	if !ok {
		return model.Entry{}, ErrNotFound
	}

	if err := tx.Commit(); err != nil {
		return model.Entry{}, err
	}

	return entry, nil
}

type eventScanner interface {
	Scan(dest ...any) error
}

type reservationScanner interface {
	Scan(dest ...any) error
}

type reservationWithUserScanner interface {
	Scan(dest ...any) error
}

type announcementScanner interface {
	Scan(dest ...any) error
}

type entryScanner interface {
	Scan(dest ...any) error
}

type entryWithBandScanner interface {
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

func scanReservation(scanner reservationScanner) (model.Reservation, bool) {
	var reservation model.Reservation
	var status string
	var cancelledAt sql.NullTime

	err := scanner.Scan(
		&reservation.ID,
		&reservation.EventID,
		&reservation.UserID,
		&reservation.ReservationNumber,
		&status,
		&reservation.ReservedAt,
		&cancelledAt,
		&reservation.CreatedAt,
		&reservation.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) || err != nil {
		return model.Reservation{}, false
	}

	reservation.Status = model.ReservationStatus(status)
	if cancelledAt.Valid {
		v := cancelledAt.Time
		reservation.CancelledAt = &v
	}

	return reservation, true
}

func scanReservationWithUser(scanner reservationWithUserScanner) (model.ReservationWithUser, bool) {
	var item model.ReservationWithUser
	var status string
	var cancelledAt sql.NullTime

	err := scanner.Scan(
		&item.ID,
		&item.EventID,
		&item.UserID,
		&item.ReservationNumber,
		&status,
		&item.ReservedAt,
		&cancelledAt,
		&item.CreatedAt,
		&item.UpdatedAt,
		&item.UserDisplayName,
		&item.UserEmail,
	)
	if errors.Is(err, sql.ErrNoRows) || err != nil {
		return model.ReservationWithUser{}, false
	}

	item.Status = model.ReservationStatus(status)
	if cancelledAt.Valid {
		v := cancelledAt.Time
		item.CancelledAt = &v
	}

	return item, true
}

func scanAnnouncement(scanner announcementScanner) (model.Announcement, bool) {
	var announcement model.Announcement

	err := scanner.Scan(
		&announcement.ID,
		&announcement.EventID,
		&announcement.Title,
		&announcement.Content,
		&announcement.PublishedAt,
		&announcement.CreatedAt,
		&announcement.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) || err != nil {
		return model.Announcement{}, false
	}

	return announcement, true
}

func scanEntry(scanner entryScanner) (model.Entry, bool) {
	var entry model.Entry
	var status string
	var message sql.NullString
	var rejectionReason sql.NullString

	err := scanner.Scan(
		&entry.ID,
		&entry.EventID,
		&entry.BandID,
		&status,
		&message,
		&rejectionReason,
		&entry.CreatedAt,
		&entry.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) || err != nil {
		return model.Entry{}, false
	}

	entry.Status = model.EntryStatus(status)
	if message.Valid {
		v := message.String
		entry.Message = &v
	}
	if rejectionReason.Valid {
		v := rejectionReason.String
		entry.RejectionReason = &v
	}

	return entry, true
}

func scanEntryWithBand(scanner entryWithBandScanner) (model.EntryWithBand, bool) {
	var item model.EntryWithBand
	var status string
	var message sql.NullString
	var rejectionReason sql.NullString

	err := scanner.Scan(
		&item.ID,
		&item.EventID,
		&item.BandID,
		&status,
		&message,
		&rejectionReason,
		&item.CreatedAt,
		&item.UpdatedAt,
		&item.BandName,
	)
	if errors.Is(err, sql.ErrNoRows) || err != nil {
		return model.EntryWithBand{}, false
	}

	item.Status = model.EntryStatus(status)
	if message.Valid {
		v := message.String
		item.Message = &v
	}
	if rejectionReason.Valid {
		v := rejectionReason.String
		item.RejectionReason = &v
	}

	return item, true
}

func stringOrNil(value *string) any {
	if value == nil {
		return nil
	}
	return strings.TrimSpace(*value)
}

func statusOrNil(status *model.EventStatus) any {
	if status == nil {
		return nil
	}
	return string(*status)
}
