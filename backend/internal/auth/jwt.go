package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/ymmtyamaterous/event-manager-for-music-api/internal/model"
)

const (
	TokenTypeAccess  = "access"
	TokenTypeRefresh = "refresh"
)

type Claims struct {
	UserID    string         `json:"uid"`
	UserType  model.UserType `json:"user_type"`
	TokenType string         `json:"token_type"`
	jwt.RegisteredClaims
}

type JWTManager struct {
	secret []byte
}

func NewJWTManager(secret string) *JWTManager {
	if secret == "" {
		secret = "dev-secret-change-me-at-least-32-characters"
	}
	return &JWTManager{secret: []byte(secret)}
}

func (m *JWTManager) GenerateAccessToken(user model.User) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID:    user.ID,
		UserType:  user.UserType,
		TokenType: TokenTypeAccess,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(1 * time.Hour)),
			Subject:   user.ID,
		},
	}
	return m.sign(claims)
}

func (m *JWTManager) GenerateRefreshToken(user model.User) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID:    user.ID,
		UserType:  user.UserType,
		TokenType: TokenTypeRefresh,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(30 * 24 * time.Hour)),
			Subject:   user.ID,
		},
	}
	return m.sign(claims)
}

func (m *JWTManager) ParseToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (any, error) {
		return m.secret, nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}

func (m *JWTManager) sign(claims Claims) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(m.secret)
}
