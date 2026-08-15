package config

import (
	"log"

	"github.com/joho/godotenv"
	"github.com/kelseyhightower/envconfig"
)

type Config struct {
	Port              string `envconfig:"PORT" default:"8080"`
	DatabaseURL        string `envconfig:"DATABASE_URL" required:"true"`
	SupabaseJWTSecret string `envconfig:"SUPABASE_JWT_SECRET" default:""`
	AllowedOrigins    string `envconfig:"ALLOWED_ORIGINS" default:"http://localhost:3000,http://localhost:3010,http://127.0.0.1:3000,http://127.0.0.1:3010"`
	Environment       string `envconfig:"ENVIRONMENT" default:"development"`
}

func Load() (*Config, error) {
	// Try to load .env file if present (silently ignore if not found)
	_ = godotenv.Load(".env", "../.env")

	var cfg Config
	if err := envconfig.Process("", &cfg); err != nil {
		log.Printf("[Config] Failed to process environment variables: %v", err)
		return nil, err
	}

	return &cfg, nil
}
