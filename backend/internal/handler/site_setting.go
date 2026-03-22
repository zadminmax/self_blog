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
	row, err := h.SiteSettings.Get()
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
	})
	if err != nil {
		response.ErrInternal(c, "save site settings")
		return
	}
	response.OK(c, out)
}
