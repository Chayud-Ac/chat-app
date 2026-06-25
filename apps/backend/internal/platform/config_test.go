package platform_test

import (
	"testing"

	"github.com/Chayud-Ac/chat-app/apps/backend/internal/platform"
)

// setRequiredEnv ตั้ง env ที่ LoadConfig บังคับ เพื่อให้ test โฟกัสที่ field ที่สนใจ.
func setRequiredEnv(t *testing.T) {
	t.Helper()
	t.Setenv("DATABASE_URL", "postgres://x")
	t.Setenv("REDIS_ADDR", "localhost:6379")
	t.Setenv("ANTHROPIC_API_KEY", "sk-test")
}

func TestLoadConfigLogFormatDefaultsToText(t *testing.T) {
	setRequiredEnv(t)

	cfg, err := platform.LoadConfig()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.LogFormat != "text" {
		t.Errorf("LogFormat=%q, want text", cfg.LogFormat)
	}
}

func TestLoadConfigLogFormatFromEnv(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("LOG_FORMAT", "json")

	cfg, err := platform.LoadConfig()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.LogFormat != "json" {
		t.Errorf("LogFormat=%q, want json", cfg.LogFormat)
	}
}
