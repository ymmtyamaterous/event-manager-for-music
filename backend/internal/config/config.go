package config

import (
	"os"
	"strings"
)

type Config struct {
	Host           string
	APIPort        string
	AllowedOrigins []string
	DatabaseURL    string
	JWTSecret      string
	UploadDir      string
}

func Load() Config {
	return Config{
		Host:           getenv("HOST", "0.0.0.0"),
		APIPort:        getenv("API_PORT", "8000"),
		AllowedOrigins: splitCSV(getenv("ALLOWED_ORIGINS", "http://localhost:3000")),
		DatabaseURL:    getenv("DATABASE_URL", ""),
		JWTSecret:      getenv("JWT_SECRET", ""),
		UploadDir:      getenv("UPLOAD_DIR", "/workspace/uploads"),
	}
}

func (c Config) Address() string {
	return c.Host + ":" + c.APIPort
}

func getenv(key string, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func splitCSV(value string) []string {
	if value == "" {
		return []string{}
	}

	raw := strings.Split(value, ",")
	cleaned := make([]string, 0, len(raw))
	for _, item := range raw {
		v := strings.TrimSpace(item)
		if v == "" {
			continue
		}
		cleaned = append(cleaned, v)
	}

	return cleaned
}
