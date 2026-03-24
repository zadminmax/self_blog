package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/selfblog/backend/internal/service"
	"github.com/selfblog/backend/pkg/response"
)

type siteSettingBody struct {
	SiteName        string `json:"site_name"`
	SiteTagline     string `json:"site_tagline"`
	MetaDescription string `json:"meta_description"`
	LogoURL         string `json:"logo_url"`
	FooterLine      string `json:"footer_line"`
	AboutTitle      string `json:"about_title"`
	AboutLead       string `json:"about_lead"`
	AboutBody       string `json:"about_body"`

	HomeHeroTitle            string `json:"home_hero_title"`
	HomeHeroLead             string `json:"home_hero_lead"`
	HomeHeroBtnPosts         string `json:"home_hero_btn_posts"`
	HomeHeroBtnDemos         string `json:"home_hero_btn_demos"`
	HomeSidebarNavTitle      string `json:"home_sidebar_nav_title"`
	HomeSectionTagsTitle     string `json:"home_section_tags_title"`
	HomeSectionTagsHint      string `json:"home_section_tags_hint"`
	HomeSectionPostsTitle    string `json:"home_section_posts_title"`
	HomeSectionPostsMore     string `json:"home_section_posts_more"`
	HomeSectionDemosTitle    string `json:"home_section_demos_title"`
	HomeSectionDemosMore     string `json:"home_section_demos_more"`
	HomeSectionServicesTitle string `json:"home_section_services_title"`
	HomeSectionServicesSub   string `json:"home_section_services_sub"`
	HomeSectionServicesMore  string `json:"home_section_services_more"`
	HomePromoTitle           string `json:"home_promo_title"`
	HomePromoLead            string `json:"home_promo_lead"`
	HomePromoBtnServices     string `json:"home_promo_btn_services"`
	HomePromoBtnAbout        string `json:"home_promo_btn_about"`
}

func (h *Handler) PublicSiteSettings(c *gin.Context) {
	out, err := h.SiteSettings.PublicPayload()
	if err != nil {
		response.ErrInternal(c, "site settings")
		return
	}
	response.OK(c, out)
}

func (h *Handler) AdminSiteSettingsGet(c *gin.Context) {
	row, err := h.SiteSettings.GetForAdmin()
	if err != nil {
		response.ErrInternal(c, "site settings")
		return
	}
	response.OK(c, row)
}

func (h *Handler) AdminSiteSettingsPut(c *gin.Context) {
	var req siteSettingBody
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrBadRequest(c, "invalid body")
		return
	}
	out, err := h.SiteSettings.Update(service.SiteSettingInput{
		SiteName:        req.SiteName,
		SiteTagline:     req.SiteTagline,
		MetaDescription: req.MetaDescription,
		LogoURL:         req.LogoURL,
		FooterLine:      req.FooterLine,
		AboutTitle:      req.AboutTitle,
		AboutLead:       req.AboutLead,
		AboutBody:       req.AboutBody,

		HomeHeroTitle:            req.HomeHeroTitle,
		HomeHeroLead:             req.HomeHeroLead,
		HomeHeroBtnPosts:         req.HomeHeroBtnPosts,
		HomeHeroBtnDemos:         req.HomeHeroBtnDemos,
		HomeSidebarNavTitle:      req.HomeSidebarNavTitle,
		HomeSectionTagsTitle:     req.HomeSectionTagsTitle,
		HomeSectionTagsHint:      req.HomeSectionTagsHint,
		HomeSectionPostsTitle:    req.HomeSectionPostsTitle,
		HomeSectionPostsMore:     req.HomeSectionPostsMore,
		HomeSectionDemosTitle:    req.HomeSectionDemosTitle,
		HomeSectionDemosMore:     req.HomeSectionDemosMore,
		HomeSectionServicesTitle: req.HomeSectionServicesTitle,
		HomeSectionServicesSub:   req.HomeSectionServicesSub,
		HomeSectionServicesMore:  req.HomeSectionServicesMore,
		HomePromoTitle:           req.HomePromoTitle,
		HomePromoLead:            req.HomePromoLead,
		HomePromoBtnServices:     req.HomePromoBtnServices,
		HomePromoBtnAbout:        req.HomePromoBtnAbout,
	})
	if err != nil {
		response.ErrInternal(c, "save site settings")
		return
	}
	response.OK(c, out)
}
