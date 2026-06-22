package platform

import (
	"fmt"
	"os"
)

type Config struct {
	DatabaseURL     string
	RedisAddr       string
	AnthropicAPIKey string
	AnthropicModel  string
	Port            string
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
	return &Config{
		DatabaseURL:     dbURL,
		RedisAddr:       redisAddr,
		AnthropicAPIKey: anthropicKey,
		AnthropicModel:  anthropicModel,
		Port:            port,
	}, nil
}
