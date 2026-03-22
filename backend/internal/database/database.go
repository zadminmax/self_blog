package database

import (
	"fmt"
	"log"

	"github.com/selfblog/backend/internal/config"
	"github.com/selfblog/backend/internal/domain"
	"github.com/glebarez/sqlite"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Connect(cfg *config.Config) (*gorm.DB, error) {
	var dialector gorm.Dialector
	if cfg.UseSQLite || cfg.DatabaseURL == "" {
		dialector = sqlite.Open(cfg.SQLitePath)
		log.Printf("database: sqlite %s", cfg.SQLitePath)
	} else {
		dialector = postgres.Open(cfg.DatabaseURL)
		log.Println("database: postgres")
	}
	db, err := gorm.Open(dialector, &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}
	if err := db.AutoMigrate(
		&domain.User{},
		&domain.Role{},
		&domain.Permission{},
		&domain.Post{},
		&domain.Category{},
		&domain.Tag{},
		&domain.MediaCategory{},
		&domain.Media{},
		&domain.DemoCategory{},
		&domain.Demo{},
		&domain.ServiceOffer{},
		&domain.SiteSetting{},
	); err != nil {
		return nil, fmt.Errorf("migrate: %w", err)
	}
	return db, nil
}
