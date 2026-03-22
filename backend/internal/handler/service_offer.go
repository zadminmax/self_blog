package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/selfblog/backend/internal/service"
	"github.com/selfblog/backend/pkg/response"
)

type serviceOfferBody struct {
	Name      string `json:"name" binding:"required"`
	Slug      string `json:"slug"`
	Category  string `json:"category"`
	PriceText string `json:"price_text"`
	Summary   string `json:"summary"`
	Content   string `json:"content"`
	CoverURL  string `json:"cover_url"`
	SortOrder int    `json:"sort_order"`
	Featured  bool   `json:"featured"`
	Enabled   bool   `json:"enabled"`
}

func (h *Handler) PublicServiceList(c *gin.Context) {
	list, err := h.Services.ListPublic()
	if err != nil {
		response.ErrInternal(c, "list services")
		return
	}
	response.OK(c, list)
}

func (h *Handler) AdminServiceList(c *gin.Context) {
	list, err := h.Services.ListAdmin()
	if err != nil {
		response.ErrInternal(c, "list services")
		return
	}
	response.OK(c, list)
}

func (h *Handler) AdminServiceCreate(c *gin.Context) {
	var req serviceOfferBody
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrBadRequest(c, "invalid body")
		return
	}
	out, err := h.Services.Create(service.ServiceOfferInput{
		Name:      req.Name,
		Slug:      req.Slug,
		Category:  req.Category,
		PriceText: req.PriceText,
		Summary:   req.Summary,
		Content:   req.Content,
		CoverURL:  req.CoverURL,
		SortOrder: req.SortOrder,
		Featured:  req.Featured,
		Enabled:   req.Enabled,
	})
	if err != nil {
		response.ErrBadRequest(c, err.Error())
		return
	}
	response.OK(c, out)
}

func (h *Handler) AdminServiceUpdate(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrBadRequest(c, "invalid id")
		return
	}
	var req serviceOfferBody
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrBadRequest(c, "invalid body")
		return
	}
	out, err := h.Services.Update(id, service.ServiceOfferInput{
		Name:      req.Name,
		Slug:      req.Slug,
		Category:  req.Category,
		PriceText: req.PriceText,
		Summary:   req.Summary,
		Content:   req.Content,
		CoverURL:  req.CoverURL,
		SortOrder: req.SortOrder,
		Featured:  req.Featured,
		Enabled:   req.Enabled,
	})
	if err != nil {
		response.ErrNotFound(c, "not found")
		return
	}
	response.OK(c, out)
}

func (h *Handler) AdminServiceDelete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrBadRequest(c, "invalid id")
		return
	}
	if err := h.Services.Delete(id); err != nil {
		response.ErrNotFound(c, "not found")
		return
	}
	response.OKMessage(c, "deleted", nil)
}

