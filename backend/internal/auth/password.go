package auth

import (
	"regexp"

	"golang.org/x/crypto/bcrypt"
)

var passwordPattern = regexp.MustCompile(`^(?=.*[A-Za-z])(?=.*\d).{8,}$`)

func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), 10)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

func VerifyPassword(hashedPassword string, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password)) == nil
}

func IsPasswordStrong(password string) bool {
	return passwordPattern.MatchString(password)
}
