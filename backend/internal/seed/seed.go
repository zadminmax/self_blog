package seed

import (
	"log"

	"github.com/selfblog/backend/internal/config"
	"github.com/selfblog/backend/internal/domain"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var defaultPermissions = []string{
	"post:read", "post:write", "post:delete",
	"media:upload", "media:manage",
	"category:manage", "tag:manage",
	"user:manage", "role:manage",
	"demo:manage", "demo:read",
	"service:manage", "service:read",
	"site:manage",
	"login_security:read",
}

func Run(db *gorm.DB, cfg *config.Config) error {
	for _, name := range defaultPermissions {
		var p domain.Permission
		if err := db.Where("name = ?", name).FirstOrCreate(&p, domain.Permission{Name: name}).Error; err != nil {
			return err
		}
	}

	var adminRole domain.Role
	if err := db.Where("name = ?", "admin").FirstOrCreate(&adminRole, domain.Role{
		Name:        "admin",
		Description: "Administrator",
	}).Error; err != nil {
		return err
	}

	var perms []domain.Permission
	if err := db.Find(&perms).Error; err != nil {
		return err
	}
	if err := db.Model(&adminRole).Association("Permissions").Replace(perms); err != nil {
		return err
	}

	var user domain.User
	err := db.Where("username = ?", cfg.AdminSeedUser).First(&user).Error
	if err == gorm.ErrRecordNotFound {
		hash, err := bcrypt.GenerateFromPassword([]byte(cfg.AdminSeedPass), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		user = domain.User{
			Username:     cfg.AdminSeedUser,
			PasswordHash: string(hash),
			Active:       true,
		}
		if err := db.Create(&user).Error; err != nil {
			return err
		}
		if err := db.Model(&user).Association("Roles").Append(&adminRole); err != nil {
			return err
		}
		log.Printf("seed: created admin user %q", cfg.AdminSeedUser)
	} else if err != nil {
		return err
	}

	// Seed default media categories (feature-based, not article categories).
	defaultMediaCats := []domain.MediaCategory{
		{Name: "头像", Slug: "avatar"},
		{Name: "文章内容", Slug: "article-content"},
		{Name: "直接上传", Slug: "direct-upload"},
		{Name: "动画", Slug: "animation"},
	}
	for _, mc := range defaultMediaCats {
		var existing domain.MediaCategory
		if err := db.Where("slug = ?", mc.Slug).FirstOrCreate(&existing, mc).Error; err != nil {
			return err
		}
	}

	// Seed default demo categories (education/AI/mall ...).
	defaultDemoCats := []domain.DemoCategory{
		{Name: "教育", Slug: "education"},
		{Name: "AI", Slug: "ai"},
		{Name: "商场", Slug: "mall"},
	}
	for _, dc := range defaultDemoCats {
		var existing domain.DemoCategory
		if err := db.Where("slug = ?", dc.Slug).FirstOrCreate(&existing, dc).Error; err != nil {
			return err
		}
	}
	return nil
}
