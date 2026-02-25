package http

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"

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
	mux.HandleFunc("GET /api/v1/events", app.handleListEvents)
	mux.HandleFunc("POST /api/v1/events", app.handleCreateEvent)
	mux.HandleFunc("GET /api/v1/events/{id}", app.handleGetEvent)
	mux.HandleFunc("PATCH /api/v1/events/{id}", app.handleUpdateEvent)
	mux.HandleFunc("DELETE /api/v1/events/{id}", app.handleDeleteEvent)
	mux.HandleFunc("POST /api/v1/events/{id}/reservations", app.handleCreateReservation)
	mux.HandleFunc("GET /api/v1/reservations/me", app.handleListMyReservations)
	mux.HandleFunc("PATCH /api/v1/reservations/{id}/cancel", app.handleCancelReservation)

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
