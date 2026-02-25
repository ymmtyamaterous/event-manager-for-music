package http

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/ymmtyamaterous/event-manager-for-music-api/internal/auth"
	"github.com/ymmtyamaterous/event-manager-for-music-api/internal/config"
	"github.com/ymmtyamaterous/event-manager-for-music-api/internal/model"
	"github.com/ymmtyamaterous/event-manager-for-music-api/internal/store"
)

type Server struct {
	httpServer *http.Server
}

type healthResponse struct {
	Status string `json:"status"`
}

type app struct {
	store      store.Repository
	jwtManager *auth.JWTManager
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type registerRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	DisplayName string `json:"display_name"`
	UserType    string `json:"user_type"`
}

type updateMeRequest struct {
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	DisplayName string `json:"display_name"`
	Email       string `json:"email"`
}

type createEventRequest struct {
	Title         string `json:"title"`
	Description   string `json:"description"`
	VenueName     string `json:"venue_name"`
	VenueAddress  string `json:"venue_address"`
	EventDate     string `json:"event_date"`
	DoorsOpenTime string `json:"doors_open_time"`
	StartTime     string `json:"start_time"`
	EndTime       string `json:"end_time"`
	TicketPrice   *int   `json:"ticket_price"`
	Capacity      *int   `json:"capacity"`
	Status        string `json:"status"`
}

type updateEventRequest struct {
	Title         *string `json:"title"`
	Description   *string `json:"description"`
	VenueName     *string `json:"venue_name"`
	VenueAddress  *string `json:"venue_address"`
	EventDate     *string `json:"event_date"`
	DoorsOpenTime *string `json:"doors_open_time"`
	StartTime     *string `json:"start_time"`
	EndTime       *string `json:"end_time"`
	TicketPrice   *int    `json:"ticket_price"`
	Capacity      *int    `json:"capacity"`
	Status        *string `json:"status"`
}

type announcementRequest struct {
	Title   string `json:"title"`
	Content string `json:"content"`
}

type createEntryRequest struct {
	BandID  string `json:"band_id"`
	Message string `json:"message"`
}

type rejectEntryRequest struct {
	RejectionReason string `json:"rejection_reason"`
}

type createBandRequest struct {
	Name        string `json:"name"`
	Genre       string `json:"genre"`
	Description string `json:"description"`
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type authResponse struct {
	AccessToken  string     `json:"access_token"`
	RefreshToken string     `json:"refresh_token"`
	User         model.User `json:"user"`
}

type tokenRefreshResponse struct {
	AccessToken string `json:"access_token"`
}

type errorResponse struct {
	Error string `json:"error"`
}

func NewServer(cfg config.Config) *Server {
	var repository store.Repository
	if strings.TrimSpace(cfg.DatabaseURL) != "" {
		postgresStore, err := store.NewPostgresStore(cfg.DatabaseURL)
		if err != nil {
			log.Printf("postgres接続に失敗したためメモリストアで起動します: %v", err)
			repository = store.NewMemoryStore()
		} else {
			repository = postgresStore
		}
	} else {
		repository = store.NewMemoryStore()
	}

	app := &app{
		store:      repository,
		jwtManager: auth.NewJWTManager(cfg.JWTSecret),
	}

	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/v1/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, healthResponse{Status: "ok"})
	})
	mux.HandleFunc("POST /api/v1/auth/register", app.handleRegister)
	mux.HandleFunc("POST /api/v1/auth/login", app.handleLogin)
	mux.HandleFunc("POST /api/v1/auth/refresh", app.handleRefresh)
	mux.HandleFunc("GET /api/v1/users/me", app.handleGetMe)
	mux.HandleFunc("PATCH /api/v1/users/me", app.handlePatchMe)
	mux.HandleFunc("GET /api/v1/bands/me", app.handleListMyBands)
	mux.HandleFunc("GET /api/v1/bands/{id}/entries", app.handleListBandEntries)
	mux.HandleFunc("POST /api/v1/bands", app.handleCreateBand)
	mux.HandleFunc("GET /api/v1/events", app.handleListEvents)
	mux.HandleFunc("POST /api/v1/events", app.handleCreateEvent)
	mux.HandleFunc("GET /api/v1/events/{id}", app.handleGetEvent)
	mux.HandleFunc("PATCH /api/v1/events/{id}", app.handleUpdateEvent)
	mux.HandleFunc("DELETE /api/v1/events/{id}", app.handleDeleteEvent)
	mux.HandleFunc("POST /api/v1/events/{id}/reservations", app.handleCreateReservation)
	mux.HandleFunc("GET /api/v1/events/{id}/reservations", app.handleListEventReservations)
	mux.HandleFunc("GET /api/v1/events/{id}/announcements", app.handleListAnnouncements)
	mux.HandleFunc("POST /api/v1/events/{id}/announcements", app.handleCreateAnnouncement)
	mux.HandleFunc("PATCH /api/v1/events/{id}/announcements/{announcementId}", app.handleUpdateAnnouncement)
	mux.HandleFunc("DELETE /api/v1/events/{id}/announcements/{announcementId}", app.handleDeleteAnnouncement)
	mux.HandleFunc("GET /api/v1/events/{id}/entries", app.handleListEntriesByEvent)
	mux.HandleFunc("POST /api/v1/events/{id}/entries", app.handleCreateEntry)
	mux.HandleFunc("GET /api/v1/reservations/me", app.handleListMyReservations)
	mux.HandleFunc("PATCH /api/v1/reservations/{id}/cancel", app.handleCancelReservation)
	mux.HandleFunc("PATCH /api/v1/entries/{id}/approve", app.handleApproveEntry)
	mux.HandleFunc("PATCH /api/v1/entries/{id}/reject", app.handleRejectEntry)

	server := &http.Server{
		Addr:    cfg.Address(),
		Handler: withCORS(mux, cfg.AllowedOrigins),
	}

	return &Server{httpServer: server}
}

func (s *Server) ListenAndServe() error {
	return s.httpServer.ListenAndServe()
}

func (a *app) handleRegister(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "リクエスト形式が不正です")
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.FirstName = strings.TrimSpace(req.FirstName)
	req.LastName = strings.TrimSpace(req.LastName)
	req.DisplayName = strings.TrimSpace(req.DisplayName)

	if req.Email == "" || req.Password == "" || req.FirstName == "" || req.LastName == "" || req.DisplayName == "" {
		writeError(w, http.StatusBadRequest, "必須項目が不足しています")
		return
	}

	if !auth.IsPasswordStrong(req.Password) {
		writeError(w, http.StatusBadRequest, "パスワードは8文字以上かつ英数字混在で入力してください")
		return
	}

	userType, err := parseRegisterUserType(req.UserType)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "サーバーエラー")
		return
	}

	createdUser, err := a.store.CreateUser(model.User{
		Email:        req.Email,
		PasswordHash: hash,
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		DisplayName:  req.DisplayName,
		UserType:     userType,
	})
	if err != nil {
		if errors.Is(err, store.ErrConflict) {
			writeError(w, http.StatusConflict, "このメールアドレスは既に使用されています")
			return
		}
		writeError(w, http.StatusInternalServerError, "サーバーエラー")
		return
	}

	accessToken, err := a.jwtManager.GenerateAccessToken(createdUser)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "サーバーエラー")
		return
	}

	refreshToken, err := a.jwtManager.GenerateRefreshToken(createdUser)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "サーバーエラー")
		return
	}

	writeJSON(w, http.StatusCreated, authResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         sanitizeUser(createdUser),
	})
}

func (a *app) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "リクエスト形式が不正です")
		return
	}

	user, exists := a.store.FindUserByEmail(req.Email)
	if !exists || !auth.VerifyPassword(user.PasswordHash, req.Password) {
		writeError(w, http.StatusUnauthorized, "メールアドレスまたはパスワードが正しくありません")
		return
	}

	accessToken, err := a.jwtManager.GenerateAccessToken(user)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "サーバーエラー")
		return
	}
	refreshToken, err := a.jwtManager.GenerateRefreshToken(user)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "サーバーエラー")
		return
	}

	writeJSON(w, http.StatusOK, authResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         sanitizeUser(user),
	})
}

func (a *app) handleRefresh(w http.ResponseWriter, r *http.Request) {
	var req refreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "リクエスト形式が不正です")
		return
	}

	claims, err := a.jwtManager.ParseToken(req.RefreshToken)
	if err != nil || claims.TokenType != auth.TokenTypeRefresh {
		writeError(w, http.StatusUnauthorized, "リフレッシュトークンが不正です")
		return
	}

	user, exists := a.store.GetUserByID(claims.UserID)
	if !exists {
		writeError(w, http.StatusUnauthorized, "ユーザーが存在しません")
		return
	}

	accessToken, err := a.jwtManager.GenerateAccessToken(user)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "サーバーエラー")
		return
	}

	writeJSON(w, http.StatusOK, tokenRefreshResponse{AccessToken: accessToken})
}

func (a *app) handleGetMe(w http.ResponseWriter, r *http.Request) {
	claims, err := a.parseAccessTokenFromHeader(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}

	user, exists := a.store.GetUserByID(claims.UserID)
	if !exists {
		writeError(w, http.StatusUnauthorized, "ユーザーが存在しません")
		return
	}

	writeJSON(w, http.StatusOK, sanitizeUser(user))
}

func (a *app) handlePatchMe(w http.ResponseWriter, r *http.Request) {
	claims, err := a.parseAccessTokenFromHeader(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}

	var req updateMeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "リクエスト形式が不正です")
		return
	}

	if strings.TrimSpace(req.Email) == "" && strings.TrimSpace(req.FirstName) == "" && strings.TrimSpace(req.LastName) == "" && strings.TrimSpace(req.DisplayName) == "" {
		writeError(w, http.StatusBadRequest, "更新項目が不足しています")
		return
	}

	updatedUser, err := a.store.UpdateUser(claims.UserID, req.FirstName, req.LastName, req.DisplayName, req.Email)
	if err != nil {
		switch {
		case errors.Is(err, store.ErrNotFound):
			writeError(w, http.StatusNotFound, "ユーザーが存在しません")
		case errors.Is(err, store.ErrConflict):
			writeError(w, http.StatusConflict, "このメールアドレスは既に使用されています")
		default:
			writeError(w, http.StatusInternalServerError, "サーバーエラー")
		}
		return
	}

	writeJSON(w, http.StatusOK, sanitizeUser(updatedUser))
}

func (a *app) handleListMyBands(w http.ResponseWriter, r *http.Request) {
	claims, err := a.parseAccessTokenFromHeader(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}
	if claims.UserType != model.UserTypePerformer {
		writeError(w, http.StatusForbidden, "出演者ユーザーのみバンド一覧を参照できます")
		return
	}

	bands, err := a.store.ListBandsByOwner(claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "サーバーエラー")
		return
	}

	writeJSON(w, http.StatusOK, bands)
}

func (a *app) handleCreateBand(w http.ResponseWriter, r *http.Request) {
	claims, err := a.parseAccessTokenFromHeader(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}
	if claims.UserType != model.UserTypePerformer {
		writeError(w, http.StatusForbidden, "出演者ユーザーのみバンド作成できます")
		return
	}

	var req createBandRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "リクエスト形式が不正です")
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "name は必須です")
		return
	}

	band, err := a.store.CreateBand(claims.UserID, req.Name, req.Genre, req.Description)
	if err != nil {
		switch {
		case errors.Is(err, store.ErrForbidden):
			writeError(w, http.StatusForbidden, "バンド作成権限がありません")
		case errors.Is(err, store.ErrNotFound):
			writeError(w, http.StatusNotFound, "ユーザーが存在しません")
		default:
			writeError(w, http.StatusInternalServerError, "サーバーエラー")
		}
		return
	}

	writeJSON(w, http.StatusCreated, band)
}

func (a *app) handleListBandEntries(w http.ResponseWriter, r *http.Request) {
	claims, err := a.parseAccessTokenFromHeader(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}
	if claims.UserType != model.UserTypePerformer {
		writeError(w, http.StatusForbidden, "出演者ユーザーのみエントリー一覧を参照できます")
		return
	}

	status := strings.TrimSpace(r.URL.Query().Get("status"))
	entries, err := a.store.ListEntriesByBand(r.PathValue("id"), claims.UserID, status)
	if err != nil {
		switch {
		case errors.Is(err, store.ErrForbidden):
			writeError(w, http.StatusForbidden, "このバンドのエントリー一覧を参照する権限がありません")
		case errors.Is(err, store.ErrNotFound):
			writeError(w, http.StatusNotFound, "バンドが存在しません")
		default:
			writeError(w, http.StatusInternalServerError, "サーバーエラー")
		}
		return
	}

	writeJSON(w, http.StatusOK, entries)
}

func (a *app) handleListEvents(w http.ResponseWriter, r *http.Request) {
	status := strings.TrimSpace(r.URL.Query().Get("status"))
	search := strings.TrimSpace(r.URL.Query().Get("search"))
	organizerID := strings.TrimSpace(r.URL.Query().Get("organizer_id"))

	events := a.store.ListEvents(status, search, organizerID)
	writeJSON(w, http.StatusOK, events)
}

func (a *app) handleCreateEvent(w http.ResponseWriter, r *http.Request) {
	claims, err := a.parseAccessTokenFromHeader(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}
	if claims.UserType != model.UserTypeOrganizer {
		writeError(w, http.StatusForbidden, "運営者ユーザーのみイベントを作成できます")
		return
	}

	var req createEventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "リクエスト形式が不正です")
		return
	}

	req.Title = strings.TrimSpace(req.Title)
	req.VenueName = strings.TrimSpace(req.VenueName)
	req.VenueAddress = strings.TrimSpace(req.VenueAddress)
	req.EventDate = strings.TrimSpace(req.EventDate)
	req.DoorsOpenTime = strings.TrimSpace(req.DoorsOpenTime)
	req.StartTime = strings.TrimSpace(req.StartTime)
	req.Status = strings.TrimSpace(req.Status)

	if req.Title == "" || req.VenueName == "" || req.VenueAddress == "" || req.EventDate == "" || req.DoorsOpenTime == "" || req.StartTime == "" {
		writeError(w, http.StatusBadRequest, "必須項目が不足しています")
		return
	}

	eventStatus := model.EventStatus(req.Status)
	if eventStatus != model.EventStatusDraft && eventStatus != model.EventStatusPublished {
		writeError(w, http.StatusBadRequest, "status は draft または published を指定してください")
		return
	}

	var description *string
	if strings.TrimSpace(req.Description) != "" {
		v := strings.TrimSpace(req.Description)
		description = &v
	}

	var endTime *string
	if strings.TrimSpace(req.EndTime) != "" {
		v := strings.TrimSpace(req.EndTime)
		endTime = &v
	}

	createdEvent, err := a.store.CreateEvent(model.CreateEventInput{
		OrganizerID:   claims.UserID,
		Title:         req.Title,
		Description:   description,
		VenueName:     req.VenueName,
		VenueAddress:  req.VenueAddress,
		EventDate:     req.EventDate,
		DoorsOpenTime: req.DoorsOpenTime,
		StartTime:     req.StartTime,
		EndTime:       endTime,
		TicketPrice:   req.TicketPrice,
		Capacity:      req.Capacity,
		Status:        eventStatus,
	})
	if err != nil {
		switch {
		case errors.Is(err, store.ErrForbidden):
			writeError(w, http.StatusForbidden, "運営者ユーザーのみイベントを作成できます")
		case errors.Is(err, store.ErrNotFound):
			writeError(w, http.StatusNotFound, "ユーザーが存在しません")
		default:
			writeError(w, http.StatusInternalServerError, "サーバーエラー")
		}
		return
	}

	writeJSON(w, http.StatusCreated, createdEvent)
}

func (a *app) handleGetEvent(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	event, exists := a.store.GetEventByID(id)
	if !exists {
		writeError(w, http.StatusNotFound, "イベントが存在しません")
		return
	}

	writeJSON(w, http.StatusOK, event)
}

func (a *app) handleUpdateEvent(w http.ResponseWriter, r *http.Request) {
	claims, err := a.parseAccessTokenFromHeader(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}
	if claims.UserType != model.UserTypeOrganizer {
		writeError(w, http.StatusForbidden, "運営者ユーザーのみイベントを更新できます")
		return
	}

	var req updateEventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "リクエスト形式が不正です")
		return
	}

	var status *model.EventStatus
	if req.Status != nil {
		v := model.EventStatus(strings.TrimSpace(*req.Status))
		if v != model.EventStatusDraft && v != model.EventStatusPublished && v != model.EventStatusCancelled {
			writeError(w, http.StatusBadRequest, "status は draft / published / cancelled のいずれかを指定してください")
			return
		}
		status = &v
	}

	updated, err := a.store.UpdateEvent(model.UpdateEventInput{
		ID:            r.PathValue("id"),
		OrganizerID:   claims.UserID,
		Title:         req.Title,
		Description:   req.Description,
		VenueName:     req.VenueName,
		VenueAddress:  req.VenueAddress,
		EventDate:     req.EventDate,
		DoorsOpenTime: req.DoorsOpenTime,
		StartTime:     req.StartTime,
		EndTime:       req.EndTime,
		TicketPrice:   req.TicketPrice,
		Capacity:      req.Capacity,
		Status:        status,
	})
	if err != nil {
		switch {
		case errors.Is(err, store.ErrForbidden):
			writeError(w, http.StatusForbidden, "このイベントを更新する権限がありません")
		case errors.Is(err, store.ErrNotFound):
			writeError(w, http.StatusNotFound, "イベントが存在しません")
		default:
			writeError(w, http.StatusInternalServerError, "サーバーエラー")
		}
		return
	}

	writeJSON(w, http.StatusOK, updated)
}

func (a *app) handleDeleteEvent(w http.ResponseWriter, r *http.Request) {
	claims, err := a.parseAccessTokenFromHeader(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}
	if claims.UserType != model.UserTypeOrganizer {
		writeError(w, http.StatusForbidden, "運営者ユーザーのみイベントを削除できます")
		return
	}

	err = a.store.DeleteEvent(r.PathValue("id"), claims.UserID)
	if err != nil {
		switch {
		case errors.Is(err, store.ErrForbidden):
			writeError(w, http.StatusForbidden, "このイベントを削除する権限がありません")
		case errors.Is(err, store.ErrNotFound):
			writeError(w, http.StatusNotFound, "イベントが存在しません")
		default:
			writeError(w, http.StatusInternalServerError, "サーバーエラー")
		}
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (a *app) handleCreateReservation(w http.ResponseWriter, r *http.Request) {
	claims, err := a.parseAccessTokenFromHeader(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}

	eventID := r.PathValue("id")
	reservation, err := a.store.CreateReservation(claims.UserID, eventID)
	if err != nil {
		switch {
		case errors.Is(err, store.ErrForbidden):
			writeError(w, http.StatusForbidden, "観客ユーザーのみ予約できます")
		case errors.Is(err, store.ErrNotFound):
			writeError(w, http.StatusNotFound, "イベントまたはユーザーが存在しません")
		case errors.Is(err, store.ErrCapacityFull):
			writeError(w, http.StatusConflict, "定員に達しているため予約できません")
		case errors.Is(err, store.ErrConflict):
			writeError(w, http.StatusConflict, "同一イベントへの重複予約はできません")
		default:
			writeError(w, http.StatusInternalServerError, "サーバーエラー")
		}
		return
	}

	writeJSON(w, http.StatusCreated, reservation)
}

func (a *app) handleListEventReservations(w http.ResponseWriter, r *http.Request) {
	claims, err := a.parseAccessTokenFromHeader(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}
	if claims.UserType != model.UserTypeOrganizer {
		writeError(w, http.StatusForbidden, "運営者ユーザーのみ予約者一覧を参照できます")
		return
	}

	eventID := r.PathValue("id")
	status := strings.TrimSpace(r.URL.Query().Get("status"))
	search := strings.TrimSpace(r.URL.Query().Get("search"))
	format := strings.TrimSpace(r.URL.Query().Get("format"))

	items, err := a.store.ListReservationsByEvent(eventID, claims.UserID, status, search)
	if err != nil {
		switch {
		case errors.Is(err, store.ErrForbidden):
			writeError(w, http.StatusForbidden, "このイベントの予約者一覧を参照する権限がありません")
		case errors.Is(err, store.ErrNotFound):
			writeError(w, http.StatusNotFound, "イベントが存在しません")
		default:
			writeError(w, http.StatusInternalServerError, "サーバーエラー")
		}
		return
	}

	if strings.EqualFold(format, "csv") {
		writeReservationsCSV(w, items)
		return
	}

	writeJSON(w, http.StatusOK, items)
}

func (a *app) handleListMyReservations(w http.ResponseWriter, r *http.Request) {
	claims, err := a.parseAccessTokenFromHeader(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}

	status := strings.TrimSpace(r.URL.Query().Get("status"))
	reservations := a.store.ListReservationsByUser(claims.UserID, status)
	writeJSON(w, http.StatusOK, reservations)
}

func (a *app) handleCancelReservation(w http.ResponseWriter, r *http.Request) {
	claims, err := a.parseAccessTokenFromHeader(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}

	reservationID := r.PathValue("id")
	reservation, err := a.store.CancelReservation(claims.UserID, reservationID)
	if err != nil {
		switch {
		case errors.Is(err, store.ErrForbidden):
			writeError(w, http.StatusForbidden, "この予約をキャンセルする権限がありません")
		case errors.Is(err, store.ErrNotFound):
			writeError(w, http.StatusNotFound, "予約が存在しません")
		case errors.Is(err, store.ErrConflict):
			writeError(w, http.StatusConflict, "既にキャンセル済みです")
		default:
			writeError(w, http.StatusInternalServerError, "サーバーエラー")
		}
		return
	}

	writeJSON(w, http.StatusOK, reservation)
}

func (a *app) handleListAnnouncements(w http.ResponseWriter, r *http.Request) {
	eventID := r.PathValue("id")
	announcements, err := a.store.ListAnnouncementsByEvent(eventID)
	if err != nil {
		switch {
		case errors.Is(err, store.ErrNotFound):
			writeError(w, http.StatusNotFound, "イベントが存在しません")
		default:
			writeError(w, http.StatusInternalServerError, "サーバーエラー")
		}
		return
	}

	writeJSON(w, http.StatusOK, announcements)
}

func (a *app) handleCreateAnnouncement(w http.ResponseWriter, r *http.Request) {
	claims, err := a.parseAccessTokenFromHeader(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}
	if claims.UserType != model.UserTypeOrganizer {
		writeError(w, http.StatusForbidden, "運営者ユーザーのみお知らせを作成できます")
		return
	}

	var req announcementRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "リクエスト形式が不正です")
		return
	}

	req.Title = strings.TrimSpace(req.Title)
	req.Content = strings.TrimSpace(req.Content)
	if req.Title == "" || req.Content == "" {
		writeError(w, http.StatusBadRequest, "title と content は必須です")
		return
	}

	eventID := r.PathValue("id")
	announcement, err := a.store.CreateAnnouncement(eventID, claims.UserID, req.Title, req.Content)
	if err != nil {
		switch {
		case errors.Is(err, store.ErrForbidden):
			writeError(w, http.StatusForbidden, "このイベントにお知らせを作成する権限がありません")
		case errors.Is(err, store.ErrNotFound):
			writeError(w, http.StatusNotFound, "イベントが存在しません")
		default:
			writeError(w, http.StatusInternalServerError, "サーバーエラー")
		}
		return
	}

	writeJSON(w, http.StatusCreated, announcement)
}

func (a *app) handleUpdateAnnouncement(w http.ResponseWriter, r *http.Request) {
	claims, err := a.parseAccessTokenFromHeader(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}
	if claims.UserType != model.UserTypeOrganizer {
		writeError(w, http.StatusForbidden, "運営者ユーザーのみお知らせを更新できます")
		return
	}

	var req announcementRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "リクエスト形式が不正です")
		return
	}

	req.Title = strings.TrimSpace(req.Title)
	req.Content = strings.TrimSpace(req.Content)
	if req.Title == "" || req.Content == "" {
		writeError(w, http.StatusBadRequest, "title と content は必須です")
		return
	}

	eventID := r.PathValue("id")
	announcementID := r.PathValue("announcementId")
	announcement, err := a.store.UpdateAnnouncement(eventID, announcementID, claims.UserID, req.Title, req.Content)
	if err != nil {
		switch {
		case errors.Is(err, store.ErrForbidden):
			writeError(w, http.StatusForbidden, "このイベントのお知らせを更新する権限がありません")
		case errors.Is(err, store.ErrNotFound):
			writeError(w, http.StatusNotFound, "イベントまたはお知らせが存在しません")
		default:
			writeError(w, http.StatusInternalServerError, "サーバーエラー")
		}
		return
	}

	writeJSON(w, http.StatusOK, announcement)
}

func (a *app) handleDeleteAnnouncement(w http.ResponseWriter, r *http.Request) {
	claims, err := a.parseAccessTokenFromHeader(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}
	if claims.UserType != model.UserTypeOrganizer {
		writeError(w, http.StatusForbidden, "運営者ユーザーのみお知らせを削除できます")
		return
	}

	eventID := r.PathValue("id")
	announcementID := r.PathValue("announcementId")
	err = a.store.DeleteAnnouncement(eventID, announcementID, claims.UserID)
	if err != nil {
		switch {
		case errors.Is(err, store.ErrForbidden):
			writeError(w, http.StatusForbidden, "このイベントのお知らせを削除する権限がありません")
		case errors.Is(err, store.ErrNotFound):
			writeError(w, http.StatusNotFound, "イベントまたはお知らせが存在しません")
		default:
			writeError(w, http.StatusInternalServerError, "サーバーエラー")
		}
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (a *app) handleListEntriesByEvent(w http.ResponseWriter, r *http.Request) {
	claims, err := a.parseAccessTokenFromHeader(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}
	if claims.UserType != model.UserTypeOrganizer {
		writeError(w, http.StatusForbidden, "運営者ユーザーのみエントリー一覧を参照できます")
		return
	}

	eventID := r.PathValue("id")
	status := strings.TrimSpace(r.URL.Query().Get("status"))

	entries, err := a.store.ListEntriesByEvent(eventID, claims.UserID, status)
	if err != nil {
		switch {
		case errors.Is(err, store.ErrForbidden):
			writeError(w, http.StatusForbidden, "このイベントのエントリー一覧を参照する権限がありません")
		case errors.Is(err, store.ErrNotFound):
			writeError(w, http.StatusNotFound, "イベントが存在しません")
		default:
			writeError(w, http.StatusInternalServerError, "サーバーエラー")
		}
		return
	}

	writeJSON(w, http.StatusOK, entries)
}

func (a *app) handleCreateEntry(w http.ResponseWriter, r *http.Request) {
	claims, err := a.parseAccessTokenFromHeader(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}
	if claims.UserType != model.UserTypePerformer {
		writeError(w, http.StatusForbidden, "出演者ユーザーのみエントリー申請できます")
		return
	}

	var req createEntryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "リクエスト形式が不正です")
		return
	}

	req.BandID = strings.TrimSpace(req.BandID)
	if req.BandID == "" {
		writeError(w, http.StatusBadRequest, "band_id は必須です")
		return
	}

	entry, err := a.store.CreateEntry(r.PathValue("id"), claims.UserID, req.BandID, req.Message)
	if err != nil {
		switch {
		case errors.Is(err, store.ErrForbidden):
			writeError(w, http.StatusForbidden, "このバンドでエントリー申請する権限がありません")
		case errors.Is(err, store.ErrConflict):
			writeError(w, http.StatusConflict, "同一イベントへの重複エントリーはできません")
		case errors.Is(err, store.ErrNotFound):
			writeError(w, http.StatusNotFound, "イベントまたはユーザーが存在しません")
		default:
			writeError(w, http.StatusInternalServerError, "サーバーエラー")
		}
		return
	}

	writeJSON(w, http.StatusCreated, entry)
}

func (a *app) handleApproveEntry(w http.ResponseWriter, r *http.Request) {
	claims, err := a.parseAccessTokenFromHeader(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}
	if claims.UserType != model.UserTypeOrganizer {
		writeError(w, http.StatusForbidden, "運営者ユーザーのみエントリー承認できます")
		return
	}

	entry, err := a.store.ApproveEntry(r.PathValue("id"), claims.UserID)
	if err != nil {
		switch {
		case errors.Is(err, store.ErrForbidden):
			writeError(w, http.StatusForbidden, "このエントリーを承認する権限がありません")
		case errors.Is(err, store.ErrConflict):
			writeError(w, http.StatusConflict, "既に承認済みです")
		case errors.Is(err, store.ErrNotFound):
			writeError(w, http.StatusNotFound, "エントリーが存在しません")
		default:
			writeError(w, http.StatusInternalServerError, "サーバーエラー")
		}
		return
	}

	writeJSON(w, http.StatusOK, entry)
}

func (a *app) handleRejectEntry(w http.ResponseWriter, r *http.Request) {
	claims, err := a.parseAccessTokenFromHeader(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}
	if claims.UserType != model.UserTypeOrganizer {
		writeError(w, http.StatusForbidden, "運営者ユーザーのみエントリー却下できます")
		return
	}

	var req rejectEntryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "リクエスト形式が不正です")
		return
	}

	req.RejectionReason = strings.TrimSpace(req.RejectionReason)
	if req.RejectionReason == "" {
		writeError(w, http.StatusBadRequest, "rejection_reason は必須です")
		return
	}

	entry, err := a.store.RejectEntry(r.PathValue("id"), claims.UserID, req.RejectionReason)
	if err != nil {
		switch {
		case errors.Is(err, store.ErrForbidden):
			writeError(w, http.StatusForbidden, "このエントリーを却下する権限がありません")
		case errors.Is(err, store.ErrNotFound):
			writeError(w, http.StatusNotFound, "エントリーが存在しません")
		default:
			writeError(w, http.StatusInternalServerError, "サーバーエラー")
		}
		return
	}

	writeJSON(w, http.StatusOK, entry)
}

func (a *app) parseAccessTokenFromHeader(r *http.Request) (*auth.Claims, error) {
	rawAuthorization := r.Header.Get("Authorization")
	if rawAuthorization == "" {
		return nil, errors.New("認証情報がありません")
	}

	parts := strings.SplitN(rawAuthorization, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return nil, errors.New("認証ヘッダーの形式が不正です")
	}

	claims, err := a.jwtManager.ParseToken(parts[1])
	if err != nil || claims.TokenType != auth.TokenTypeAccess {
		return nil, errors.New("アクセストークンが不正です")
	}

	return claims, nil
}

func parseRegisterUserType(value string) (model.UserType, error) {
	switch strings.TrimSpace(value) {
	case string(model.UserTypeOrganizer):
		return model.UserTypeOrganizer, nil
	case string(model.UserTypePerformer):
		return model.UserTypePerformer, nil
	case string(model.UserTypeAudience):
		return model.UserTypeAudience, nil
	default:
		return "", fmt.Errorf("user_type は organizer / performer / audience のいずれかを指定してください")
	}
}

func sanitizeUser(user model.User) model.User {
	user.PasswordHash = ""
	return user
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, errorResponse{Error: message})
}

func writeReservationsCSV(w http.ResponseWriter, rows []model.ReservationWithUser) {
	var buf bytes.Buffer
	buf.Write([]byte{0xEF, 0xBB, 0xBF})

	cw := csv.NewWriter(&buf)
	_ = cw.Write([]string{"予約番号", "予約者名", "メールアドレス", "ステータス", "予約日時"})
	for _, row := range rows {
		_ = cw.Write([]string{
			row.ReservationNumber,
			row.UserDisplayName,
			row.UserEmail,
			string(row.Status),
			row.ReservedAt.Format(time.RFC3339),
		})
	}
	cw.Flush()

	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", "attachment; filename=reservations.csv")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(buf.Bytes())
}

func withCORS(next http.Handler, allowedOrigins []string) http.Handler {
	allowAll := len(allowedOrigins) == 0
	allowed := map[string]struct{}{}
	for _, origin := range allowedOrigins {
		allowed[origin] = struct{}{}
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		if allowAll {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		} else {
			if _, ok := allowed[origin]; ok {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Vary", "Origin")
			}
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization,Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
