package config

import "os"

type Config struct {
	Addr           string
	DBPath         string
	JWTSecret      string
	AdminUsername  string
	AdminPassword  string
}

func FromEnv() Config {
	cfg := Config{
		Addr:          getEnv("SERVER_ADDR", ":18888"),
		DBPath:        getEnv("DB_PATH", "/var/lib/license-server/license.db"),
		JWTSecret:     getEnv("JWT_SECRET", ""),
		AdminUsername: getEnv("ADMIN_USERNAME", "admin"),
		AdminPassword: getEnv("ADMIN_PASSWORD", "admin123"),
	}
	return cfg
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
