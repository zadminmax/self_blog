package main

import (
	"log"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/selfblog/backend/internal/config"
	"github.com/selfblog/backend/internal/database"
	"github.com/selfblog/backend/internal/handler"
	"github.com/selfblog/backend/internal/middleware"
	"github.com/selfblog/backend/internal/security"
	"github.com/selfblog/backend/internal/seed"
	"github.com/selfblog/backend/internal/service"
	"github.com/selfblog/backend/internal/storage"
)

func main() {
	cfg := config.Load()

	if cfg.UseSQLite || cfg.DatabaseURL == "" {
		dir := filepath.Dir(cfg.SQLitePath)
		if err := os.MkdirAll(dir, 0o755); err != nil {
			log.Fatal(err)
		}
	}
	if err := os.MkdirAll(cfg.UploadDir, 0o755); err != nil {
		log.Fatal(err)
	}
	if err := os.MkdirAll(cfg.DemoDir, 0o755); err != nil {
		log.Fatal(err)
	}

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatal(err)
	}
	if err := seed.Run(db, cfg); err != nil {
		log.Fatal("seed: ", err)
	}

	st, err := storage.NewLocal(cfg.UploadDir)
	if err != nil {
		log.Fatal(err)
	}

	authSvc := service.NewAuthService(db, cfg)
	postSvc := service.NewPostService(db)
	mediaSvc := service.NewMediaService(db, st, cfg)
	demoSvc := service.NewDemoService(db, cfg)
	serviceSvc := service.NewServiceOfferService(db)
	siteSvc := service.NewSiteSettingService(db)
	catSvc := service.NewCategoryService(db)
	tagSvc := service.NewTagService(db)
	userSvc := service.NewUserService(db, cfg)
	roleSvc := service.NewRoleService(db)
	permSvc := service.NewPermissionService(db)
	loginGuard := security.NewAdminLoginGuard()
	h := handler.New(cfg, authSvc, postSvc, mediaSvc, demoSvc, serviceSvc, siteSvc, catSvc, tagSvc, userSvc, roleSvc, permSvc, loginGuard)

	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	r.Use(middleware.CORS(cfg.CORSOrigins))

	r.GET("/health", h.Health)
	r.Static("/uploads", cfg.UploadDir)

	// Demo static serving (extracted zip content).
	r.GET("/demos/:slug", h.DemoPublicIndex)
	r.GET("/demos/:slug/*filepath", h.DemoPublicFile)

	v1 := r.Group("/api/v1")
	{
		v1.GET("/auth/slider-captcha", h.SliderCaptcha)
		v1.POST("/auth/login", h.Login)

		pub := v1.Group("/public")
		{
			pub.GET("/slider-captcha", h.SliderCaptcha)
			pub.GET("/posts", h.PublicPostList)
			pub.GET("/posts/:slug", h.PublicPostGet)
			pub.GET("/categories", h.CategoryList)
			pub.GET("/tags", h.TagList)
			pub.GET("/demos", h.PublicDemoList)
			pub.GET("/demos/:slug", h.PublicDemoGet)
			pub.GET("/services", h.PublicServiceList)
			pub.GET("/site-settings", h.PublicSiteSettings)
		}

		adm := v1.Group("/admin")
		adm.Use(middleware.JWTAuth(cfg.JWTSecret))
		adm.Use(middleware.LoadPermissionsFromDB(authSvc))
		{
			adm.GET("/me", h.Me)
			adm.POST("/media", middleware.RequirePermission("media:upload"), h.MediaUpload)
			adm.GET("/me/profile", h.MeProfileGet)
			adm.PUT("/me/profile", h.MeProfileUpdate)
			adm.PUT("/me/password", h.MePasswordUpdate)
			adm.POST("/me/avatar", h.MeAvatarUpload)

			adm.GET("/media-categories", middleware.RequirePermission("media:manage"), h.AdminMediaCategoryList)
			adm.GET("/media", middleware.RequirePermission("media:manage"), h.AdminMediaList)
			adm.DELETE("/media/:id", middleware.RequirePermission("media:manage"), h.AdminMediaDelete)
			adm.PUT("/media/:id", middleware.RequirePermission("media:manage"), h.AdminMediaUpdate)

			adm.GET("/demo-categories", middleware.RequirePermission("demo:manage"), h.AdminDemoCategoryList)
			adm.POST("/demo-categories", middleware.RequirePermission("demo:manage"), h.AdminDemoCategoryCreate)
			adm.PUT("/demo-categories/:id", middleware.RequirePermission("demo:manage"), h.AdminDemoCategoryUpdate)
			adm.DELETE("/demo-categories/:id", middleware.RequirePermission("demo:manage"), h.AdminDemoCategoryDelete)
			adm.GET("/demos", middleware.RequirePermission("demo:manage"), h.AdminDemoList)
			adm.POST("/demos", middleware.RequirePermission("demo:manage"), h.AdminDemoCreate)
			adm.PUT("/demos/:id", middleware.RequirePermission("demo:manage"), h.AdminDemoUpdate)
			adm.DELETE("/demos/:id", middleware.RequirePermission("demo:manage"), h.AdminDemoDelete)

			adm.GET("/services", middleware.RequirePermission("service:manage"), h.AdminServiceList)
			adm.POST("/services", middleware.RequirePermission("service:manage"), h.AdminServiceCreate)
			adm.PUT("/services/:id", middleware.RequirePermission("service:manage"), h.AdminServiceUpdate)
			adm.DELETE("/services/:id", middleware.RequirePermission("service:manage"), h.AdminServiceDelete)

			adm.GET("/site-settings", middleware.RequirePermission("site:manage"), h.AdminSiteSettingsGet)
			adm.PUT("/site-settings", middleware.RequirePermission("site:manage"), h.AdminSiteSettingsPut)

			adm.GET("/posts", middleware.RequirePermission("post:read"), h.AdminPostList)
			adm.GET("/posts/:id", middleware.RequirePermission("post:read"), h.AdminPostGet)
			adm.POST("/posts", middleware.RequirePermission("post:write"), h.AdminPostCreate)
			adm.PUT("/posts/:id", middleware.RequirePermission("post:write"), h.AdminPostUpdate)
			adm.DELETE("/posts/:id", middleware.RequirePermission("post:delete"), h.AdminPostDelete)

			adm.GET("/categories", middleware.RequirePermission("post:read"), h.CategoryList)
			adm.POST("/categories", middleware.RequirePermission("category:manage"), h.CategoryCreate)
			adm.PUT("/categories/:id", middleware.RequirePermission("category:manage"), h.CategoryUpdate)
			adm.DELETE("/categories/:id", middleware.RequirePermission("category:manage"), h.CategoryDelete)

			adm.GET("/tags", middleware.RequirePermission("post:read"), h.TagList)
			adm.POST("/tags", middleware.RequirePermission("tag:manage"), h.TagCreate)
			adm.PUT("/tags/:id", middleware.RequirePermission("tag:manage"), h.TagUpdate)
			adm.DELETE("/tags/:id", middleware.RequirePermission("tag:manage"), h.TagDelete)

			adm.GET("/users", middleware.RequirePermission("user:manage"), h.AdminUserList)
			adm.POST("/users", middleware.RequirePermission("user:manage"), h.AdminUserCreate)
			adm.PUT("/users/:id/roles", middleware.RequirePermission("user:manage"), h.AdminUserSetRoles)
			adm.PUT("/users/:id/active", middleware.RequirePermission("user:manage"), h.AdminUserSetActive)

			adm.GET("/roles", middleware.RequirePermission("role:manage"), h.AdminRoleList)
			adm.GET("/roles/:id", middleware.RequirePermission("role:manage"), h.AdminRoleGet)
			adm.POST("/roles", middleware.RequirePermission("role:manage"), h.AdminRoleCreate)
			adm.PUT("/roles/:id", middleware.RequirePermission("role:manage"), h.AdminRoleUpdate)
			adm.PUT("/roles/:id/permissions", middleware.RequirePermission("role:manage"), h.AdminRoleSetPermissions)

			adm.GET("/permissions", middleware.RequirePermission("role:manage"), h.AdminPermissionList)

			adm.GET("/login-security", middleware.RequirePermission("login_security:read"), h.AdminLoginSecurityGet)
			adm.DELETE("/login-security/throttle", middleware.RequirePermission("user:manage"), h.AdminLoginSecurityClearThrottle)
		}
	}

	log.Printf("listening on %s", cfg.HTTPAddr)
	if err := r.Run(cfg.HTTPAddr); err != nil {
		log.Fatal(err)
	}
}
