package main

import (
  "fmt"
  "os"

  "github.com/ymmtyamaterous/event-manager-for-music-api/internal/model"
  "github.com/ymmtyamaterous/event-manager-for-music-api/internal/store"
)

func main() {
  s, err := store.NewPostgresStore(os.Getenv("DATABASE_URL"))
  if err != nil {
    panic(err)
  }

  email := fmt.Sprintf("tmp_org_repro_%d@example.com", os.Getpid())
  u, err := s.CreateUser(model.User{Email: email, PasswordHash: "x", FirstName: "a", LastName: "b", DisplayName: "c", UserType: model.UserTypeOrganizer})
  if err != nil {
    panic(err)
  }

  _, err = s.CreateEvent(model.CreateEventInput{
    OrganizerID:   u.ID,
    Title:         "t",
    VenueName:     "v",
    VenueAddress:  "a",
    EventDate:     "2026-03-01",
    DoorsOpenTime: "18:00",
    StartTime:     "18:30",
    Status:        model.EventStatusDraft,
  })
  if err != nil {
    fmt.Printf("err type=%T\n", err)
    fmt.Printf("err=%v\n", err)
    return
  }
  fmt.Println("ok")
}
