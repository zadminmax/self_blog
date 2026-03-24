package config

import (
	"log"
	"net"
	"net/url"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Env            string
	HTTPAddr       string
	DatabaseURL    string
	UseSQLite      bool
	SQLitePath     string
	JWTSecret      string
	JWTExpireHours int
	UploadDir      string
	DemoUploadMaxBytes int64
	DemoDir        string
	PublicURL      string // e.g. http://localhost:8080
	CORSOrigins    []string
	AdminSeedUser  string
	AdminSeedPass  string
}

func Load() *Config {
	_ = godotenv.Load()

	c := &Config{
		Env:            get("APP_ENV", "development"),
		HTTPAddr:       get("HTTP_ADDR", ":8080"),
		DatabaseURL:    resolveDatabaseURL(),
		UseSQLite:      get("USE_SQLITE", "true") == "true",
		SQLitePath:     get("SQLITE_PATH", "data/selfblog.db"),
		JWTSecret:      get("JWT_SECRET", "dev-change-me-in-production"),
		JWTExpireHours: atoi(get("JWT_EXPIRE_HOURS", "72"), 72),
		UploadDir:      get("UPLOAD_DIR", "data/uploads"),
		DemoUploadMaxBytes: int64(atoi(get("DEMO_UPLOAD_MAX_BYTES", "52428800"), 52428800)), // 50 MiB
		DemoDir:        get("DEMO_DIR", "data/demos"),
		PublicURL:      strings.TrimRight(get("PUBLIC_URL", "http://localhost:8080"), "/"),
		AdminSeedUser:  get("ADMIN_SEED_USER", "admin"),
		AdminSeedPass:  get("ADMIN_SEED_PASSWORD", "admin123"),
	}
	if co := get("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000"); co != "" {
		for _, o := range strings.Split(co, ",") {
			o = strings.TrimSpace(o)
			if o != "" {
				c.CORSOrigins = append(c.CORSOrigins, o)
			}
		}
	}
	if c.JWTSecret == "dev-change-me-in-production" && c.Env == "production" {
		log.Fatal("JWT_SECRET must be set in production")
	}
	if c.DatabaseURL != "" {
		c.UseSQLite = false
	}
	return c
}

// resolveDatabaseURL 优先 DATABASE_URL（自行保证密码已 URL 编码）；否则用 DB_HOST 等分项组装，避免密码里的 @ # $ : 破坏拼接。
func resolveDatabaseURL() string {
	if v := strings.TrimSpace(os.Getenv("DATABASE_URL")); v != "" {
		return v
	}
	host := strings.TrimSpace(os.Getenv("DB_HOST"))
	if host == "" {
		return ""
	}
	user := get("DB_USER", "selfblog")
	pass := os.Getenv("DB_PASSWORD")
	dbname := get("DB_NAME", "selfblog")
	port := get("DB_PORT", "5432")
	sslmode := get("DB_SSLMODE", "disable")
	u := &url.URL{
		Scheme: "postgres",
		User:   url.UserPassword(user, pass),
		Host:   net.JoinHostPort(host, port),
		Path:   "/" + dbname,
	}
	q := url.Values{}
	q.Set("sslmode", sslmode)
	u.RawQuery = q.Encode()
	return u.String()
}

func get(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func atoi(s string, def int) int {
	n, err := strconv.Atoi(s)
	if err != nil {
		return def
	}
	return n
}
