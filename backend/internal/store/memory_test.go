package store

import (
	"errors"
	"testing"

	"github.com/ymmtyamaterous/event-manager-for-music-api/internal/model"
)

func TestMemoryStoreReservationFlow(t *testing.T) {
	s := NewMemoryStore()

	audience, err := s.CreateUser(model.User{
		Email:       "audience@example.com",
		FirstName:   "A",
		LastName:    "U",
		DisplayName: "audience",
		UserType:    model.UserTypeAudience,
	})
	if err != nil {
		t.Fatalf("failed to create audience user: %v", err)
	}

	reservation, err := s.CreateReservation(audience.ID, "evt-20260320")
	if err != nil {
		t.Fatalf("failed to create reservation: %v", err)
	}
	if reservation.Status != model.ReservationStatusReserved {
		t.Fatalf("unexpected reservation status: %s", reservation.Status)
	}

	_, err = s.CreateReservation(audience.ID, "evt-20260320")
	if !errors.Is(err, ErrConflict) {
		t.Fatalf("expected ErrConflict, got: %v", err)
	}

	cancelled, err := s.CancelReservation(audience.ID, reservation.ID)
	if err != nil {
		t.Fatalf("failed to cancel reservation: %v", err)
	}
	if cancelled.Status != model.ReservationStatusCancelled {
		t.Fatalf("unexpected cancelled status: %s", cancelled.Status)
	}
}

func TestMemoryStoreReservationForbiddenForNonAudience(t *testing.T) {
	s := NewMemoryStore()

	organizer, err := s.CreateUser(model.User{
		Email:       "organizer@example.com",
		FirstName:   "O",
		LastName:    "G",
		DisplayName: "organizer",
		UserType:    model.UserTypeOrganizer,
	})
	if err != nil {
		t.Fatalf("failed to create organizer user: %v", err)
	}

	_, err = s.CreateReservation(organizer.ID, "evt-20260320")
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden, got: %v", err)
	}
}
