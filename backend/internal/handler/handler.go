package handler

import (
	"github.com/selfblog/backend/internal/config"
	"github.com/selfblog/backend/internal/service"
)

const maxUploadBytes = 10 << 20 // 10 MiB

type Handler struct {
	Cfg          *config.Config
	Auth         *service.AuthService
	Posts        *service.PostService
	Media        *service.MediaService
	Demos        *service.DemoService
	Services     *service.ServiceOfferService
	SiteSettings *service.SiteSettingService
	Cats         *service.CategoryService
	Tags         *service.TagService
	Users        *service.UserService
	Roles        *service.RoleService
	Perms        *service.PermissionService
}

func New(cfg *config.Config, auth *service.AuthService, posts *service.PostService, media *service.MediaService, demos *service.DemoService, services *service.ServiceOfferService, siteSettings *service.SiteSettingService, cats *service.CategoryService, tags *service.TagService, users *service.UserService, roles *service.RoleService, perms *service.PermissionService) *Handler {
	return &Handler{Cfg: cfg, Auth: auth, Posts: posts, Media: media, Demos: demos, Services: services, SiteSettings: siteSettings, Cats: cats, Tags: tags, Users: users, Roles: roles, Perms: perms}
}
