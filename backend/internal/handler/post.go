package handler

import (
	"errors"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/selfblog/backend/internal/domain"
	"github.com/selfblog/backend/internal/service"
	"github.com/selfblog/backend/pkg/response"
	"gorm.io/gorm"
)

func (h *Handler) PublicPostList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	ps, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	list, total, err := h.Posts.List(service.PostListFilter{
		Page:         page,
		PageSize:     ps,
		PublicOnly:   true,
		ContentType:  c.Query("content_type"),
		TagSlug:      c.Query("tag"),
		CategorySlug: c.Query("category"),
	})
	if err != nil {
		response.ErrInternal(c, "list posts")
		return
	}
	out := make([]map[string]any, 0, len(list))
	for i := range list {
		out = append(out, h.Posts.PublicPayload(&list[i]))
	}
	response.OK(c, gin.H{"items": out, "total": total, "page": page, "page_size": ps})
}

func (h *Handler) PublicPostGet(c *gin.Context) {
	slug := c.Param("slug")
	p, err := h.Posts.GetBySlugPublic(slug)
	if err != nil {
		response.ErrNotFound(c, "post not found")
		return
	}
	response.OK(c, h.Posts.PublicPayload(p))
}

func (h *Handler) AdminPostList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	ps, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	list, total, err := h.Posts.List(service.PostListFilter{
		Page:        page,
		PageSize:    ps,
		Status:      c.Query("status"),
		ContentType: c.Query("content_type"),
		PublicOnly:  false,
	})
	if err != nil {
		response.ErrInternal(c, "list posts")
		return
	}
	response.OK(c, gin.H{"items": list, "total": total, "page": page, "page_size": ps})
}

func (h *Handler) AdminPostGet(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrBadRequest(c, "invalid id")
		return
	}
	p, err := h.Posts.GetByID(id)
	if err != nil {
		response.ErrNotFound(c, "not found")
		return
	}
	response.OK(c, p)
}

type postBody struct {
	Title       string   `json:"title" binding:"required"`
	Slug        string   `json:"slug"`
	Excerpt     string   `json:"excerpt"`
	CoverURL    string   `json:"cover_url"`
	Status      string   `json:"status"`
	ContentType string   `json:"content_type"`
	BodyFormat  string   `json:"body_format"`
	BodySource  string   `json:"body_source"`
	PublishedAt *string  `json:"published_at"`
	CategoryIDs []int64  `json:"category_ids"`
	TagIDs      []int64  `json:"tag_ids"`
}

func parsePublishedAt(s *string) (*time.Time, error) {
	if s == nil || *s == "" {
		return nil, nil
	}
	t, err := time.Parse(time.RFC3339, *s)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (h *Handler) AdminPostCreate(c *gin.Context) {
	var req postBody
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrBadRequest(c, "invalid body")
		return
	}
	pub, err := parsePublishedAt(req.PublishedAt)
	if err != nil {
		response.ErrBadRequest(c, "invalid published_at")
		return
	}
	in := service.PostInput{
		Title: req.Title, Slug: req.Slug, Excerpt: req.Excerpt, CoverURL: req.CoverURL,
		Status: req.Status, ContentType: req.ContentType, BodyFormat: req.BodyFormat,
		BodySource: req.BodySource, PublishedAt: pub, CategoryIDs: req.CategoryIDs, TagIDs: req.TagIDs,
	}
	if in.Status == domain.PostStatusPublished && in.PublishedAt == nil {
		now := time.Now()
		in.PublishedAt = &now
	}
	p, err := h.Posts.Create(in)
	if err != nil {
		response.ErrBadRequest(c, err.Error())
		return
	}
	response.OK(c, p)
}

func (h *Handler) AdminPostUpdate(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrBadRequest(c, "invalid id")
		return
	}
	var req postBody
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrBadRequest(c, "invalid body")
		return
	}
	pub, err := parsePublishedAt(req.PublishedAt)
	if err != nil {
		response.ErrBadRequest(c, "invalid published_at")
		return
	}
	in := service.PostInput{
		Title: req.Title, Slug: req.Slug, Excerpt: req.Excerpt, CoverURL: req.CoverURL,
		Status: req.Status, ContentType: req.ContentType, BodyFormat: req.BodyFormat,
		BodySource: req.BodySource, PublishedAt: pub, CategoryIDs: req.CategoryIDs, TagIDs: req.TagIDs,
	}
	p, err := h.Posts.Update(id, in)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.ErrNotFound(c, "not found")
			return
		}
		response.ErrBadRequest(c, err.Error())
		return
	}
	response.OK(c, p)
}

func (h *Handler) AdminPostDelete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrBadRequest(c, "invalid id")
		return
	}
	if err := h.Posts.Delete(id); err != nil {
		response.ErrNotFound(c, "not found")
		return
	}
	response.OKMessage(c, "deleted", nil)
}
