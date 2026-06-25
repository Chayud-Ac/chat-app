package platform

import (
	"fmt"
	"os"
	"strings"
)

type Config struct {
	DatabaseURL        string
	RedisAddr          string
	AnthropicAPIKey    string
	AnthropicModel     string
	Port               string
	CORSAllowedOrigins []string
	LogFormat          string
}

func LoadConfig() (*Config, error) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		return nil, fmt.Errorf("REDIS_ADDR is required")
	}
	anthropicKey := os.Getenv("ANTHROPIC_API_KEY")
	if anthropicKey == "" {
		return nil, fmt.Errorf("ANTHROPIC_API_KEY is required")
	}
	// ว่าง = Anthropic ตรง. ตั้ง ANTHROPIC_MODEL=anthropic/claude-opus-4-8 เมื่อใช้ DeepInfra
	// (คู่กับ ANTHROPIC_BASE_URL ที่ SDK honor เอง).
	anthropicModel := os.Getenv("ANTHROPIC_MODEL")
	if anthropicModel == "" {
		anthropicModel = "claude-opus-4-8"
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	// CORS_ALLOWED_ORIGINS = comma-separated list. Default = frontend dev server.
	corsOrigins := []string{"http://localhost:3000"}
	if v := os.Getenv("CORS_ALLOWED_ORIGINS"); v != "" {
		corsOrigins = splitAndTrim(v)
	}
	// LOG_FORMAT = "json" (prod, log aggregation) หรือ "text" (default, อ่านง่ายตอน dev).
	logFormat := os.Getenv("LOG_FORMAT")
	if logFormat == "" {
		logFormat = "text"
	}
	return &Config{
		DatabaseURL:        dbURL,
		RedisAddr:          redisAddr,
		AnthropicAPIKey:    anthropicKey,
		AnthropicModel:     anthropicModel,
		Port:               port,
		CORSAllowedOrigins: corsOrigins,
		LogFormat:          logFormat,
	}, nil
}

func splitAndTrim(csv string) []string {
	parts := strings.Split(csv, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if t := strings.TrimSpace(p); t != "" {
			out = append(out, t)
		}
	}
	return out
}
