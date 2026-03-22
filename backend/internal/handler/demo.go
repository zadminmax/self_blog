package handler

import (
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/selfblog/backend/internal/service"
	"github.com/selfblog/backend/pkg/response"
)

func (h *Handler) DemoPublicIndex(c *gin.Context) {
	slug := c.Param("slug")
	d, err := h.Demos.GetPublicBySlug(slug)
	if err != nil {
		response.ErrNotFound(c, "demo not found")
		return
	}
	baseDir := filepath.Join(h.Cfg.DemoDir, d.Slug)
	if d.EntryDir != "" {
		baseDir = filepath.Join(baseDir, d.EntryDir)
	}
	p := filepath.Join(baseDir, "index.html")
	if _, statErr := os.Stat(p); statErr != nil {
		response.ErrNotFound(c, "index not found")
		return
	}
	c.File(p)
}

func (h *Handler) DemoPublicFile(c *gin.Context) {
	slug := c.Param("slug")
	filepathParam := c.Param("filepath")
	d, err := h.Demos.GetPublicBySlug(slug)
	if err != nil {
		response.ErrNotFound(c, "demo not found")
		return
	}
	baseDir := filepath.Join(h.Cfg.DemoDir, d.Slug)
	if d.EntryDir != "" {
		baseDir = filepath.Join(baseDir, d.EntryDir)
	}

	if filepathParam == "" {
		c.Redirect(http.StatusFound, "/demos/"+slug)
		return
	}
	cleanRel := filepath.Clean(filepathParam)
	if cleanRel == "." || cleanRel == string(filepath.Separator) {
		c.Redirect(http.StatusFound, "/demos/"+slug)
		return
	}
	full := filepath.Join(baseDir, cleanRel)
	// Prevent traversal: full must remain under baseDir.
	baseClean := filepath.Clean(baseDir)
	fullClean := filepath.Clean(full)
	if fullClean != baseClean && !strings.HasPrefix(fullClean, baseClean+string(filepath.Separator)) {
		response.ErrForbidden(c, "invalid path")
		return
	}

	// If file doesn't exist, fall back to index.html (common for SPA demos).
	if _, statErr := os.Stat(fullClean); statErr != nil {
		index := filepath.Join(baseDir, "index.html")
		if _, idxErr := os.Stat(index); idxErr != nil {
			response.ErrNotFound(c, "demo asset not found")
			return
		}
		c.File(index)
		return
	}

	c.File(fullClean)
}

func (h *Handler) PublicDemoList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	ps, _ := strconv.Atoi(c.DefaultQuery("page_size", "12"))
	var categoryID *int64
	if raw := c.Query("category_id"); raw != "" {
		if id, err := strconv.ParseInt(raw, 10, 64); err == nil && id > 0 {
			categoryID = &id
		}
	}

	items, total, err := h.Demos.ListPublic(page, ps, categoryID)
	if err != nil {
		response.ErrInternal(c, "list demos")
		return
	}
	out := make([]gin.H, 0, len(items))
	for _, d := range items {
		out = append(out, gin.H{
			"id":          d.ID,
			"name":        d.Name,
			"slug":        d.Slug,
			"description": d.Description,
			"cover_url":  d.CoverURL,
			"category": func() any {
				if d.Category == nil {
					return nil
				}
				return gin.H{"id": d.Category.ID, "name": d.Category.Name, "slug": d.Category.Slug}
			}(),
		})
	}
	response.OK(c, gin.H{"items": out, "total": total, "page": page, "page_size": ps})
}

func (h *Handler) PublicDemoGet(c *gin.Context) {
	slug := c.Param("slug")
	d, err := h.Demos.GetPublicBySlug(slug)
	if err != nil {
		response.ErrNotFound(c, "demo not found")
		return
	}
	response.OK(c, gin.H{
		"id":          d.ID,
		"name":        d.Name,
		"slug":        d.Slug,
		"description": d.Description,
		"cover_url":  d.CoverURL,
		"category": func() any {
			if d.Category == nil {
				return nil
			}
			return gin.H{"id": d.Category.ID, "name": d.Category.Name, "slug": d.Category.Slug}
		}(),
		"entry_url":  h.Cfg.PublicURL + "/demos/" + d.Slug,
	})
}

type adminDemoCreateForm struct {
	Name        string `form:"name" binding:"required"`
	Slug        string `form:"slug"`
	Description string `form:"description"`
	CoverURL    string `form:"cover_url"`
	CategoryID  string `form:"category_id"`
	Enabled     *bool  `form:"enabled"`
}

func parseOptionalCategoryID(raw string) (*int64, error) {
	if raw == "" {
		return nil, nil
	}
	id, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || id <= 0 {
		return nil, nil
	}
	return &id, nil
}

func (h *Handler) AdminDemoCreate(c *gin.Context) {
	// zip file fieldName: try common names.
	fh, err := c.FormFile("file")
	if err != nil {
		fh, err = c.FormFile("file[]")
		if err != nil {
			response.ErrBadRequest(c, "zip file required")
			return
		}
	}
	if fh.Size <= 0 {
		response.ErrBadRequest(c, "invalid zip file")
		return
	}
	if fh.Size > h.Cfg.DemoUploadMaxBytes {
		response.ErrBadRequest(c, "zip file too large")
		return
	}

	form := adminDemoCreateForm{}
	_ = c.ShouldBind(&form)
	categoryID, _ := parseOptionalCategoryID(form.CategoryID)
	enabled := true
	if form.Enabled != nil {
		enabled = *form.Enabled
	}

	src, err := fh.Open()
	if err != nil {
		response.ErrBadRequest(c, "open zip failed")
		return
	}
	defer src.Close()
	buf, err := io.ReadAll(io.LimitReader(src, h.Cfg.DemoUploadMaxBytes+1))
	if err != nil {
		response.ErrInternal(c, "read zip")
		return
	}
	if int64(len(buf)) > h.Cfg.DemoUploadMaxBytes {
		response.ErrBadRequest(c, "zip file too large")
		return
	}

	in := service.DemoInput{
		Name:        form.Name,
		Slug:        form.Slug,
		Description: form.Description,
		CoverURL:    form.CoverURL,
		CategoryID:  categoryID,
		Enabled:     enabled,
	}
	d, err := h.Demos.CreateFromZip(in, buf)
	if err != nil {
		if errors.Is(err, service.ErrDemoZipRequired) || errors.Is(err, service.ErrDemoNameRequired) {
			response.ErrBadRequest(c, err.Error())
			return
		}
		response.ErrInternal(c, "create demo")
		return
	}
	response.OK(c, gin.H{"id": d.ID, "slug": d.Slug, "name": d.Name})
}

type adminDemoListResp struct {
	Items []gin.H `json:"items"`
	Total int64   `json:"total"`
	Page  int     `json:"page"`
	PageSize int  `json:"page_size"`
}

func (h *Handler) AdminDemoList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	ps, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	q := c.Query("q")

	var categoryID *int64
	if raw := c.Query("category_id"); raw != "" {
		if id, err := strconv.ParseInt(raw, 10, 64); err == nil && id > 0 {
			categoryID = &id
		}
	}

	var enabled *bool
	if raw := c.Query("enabled"); raw != "" {
		if raw == "1" {
			v := true
			enabled = &v
		} else if raw == "0" {
			v := false
			enabled = &v
		}
	}

	items, total, err := h.Demos.ListAdmin(page, ps, q, categoryID, enabled)
	if err != nil {
		response.ErrInternal(c, "list demos")
		return
	}
	out := make([]gin.H, 0, len(items))
	for _, d := range items {
		out = append(out, gin.H{
			"id":           d.ID,
			"name":         d.Name,
			"slug":         d.Slug,
			"description":  d.Description,
			"cover_url":   d.CoverURL,
			"enabled":      d.Enabled,
			"category": func() any {
				if d.Category == nil {
					return nil
				}
				return gin.H{"id": d.Category.ID, "name": d.Category.Name, "slug": d.Category.Slug}
			}(),
		})
	}
	response.OK(c, gin.H{"items": out, "total": total, "page": page, "page_size": ps})
}

type adminDemoUpdateReq struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	CoverURL    *string `json:"cover_url"`
	CategoryID  *int64  `json:"category_id"`
	Enabled     *bool   `json:"enabled"`
}

func (h *Handler) AdminDemoUpdate(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrBadRequest(c, "invalid id")
		return
	}

	var req adminDemoUpdateReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrBadRequest(c, "invalid body")
		return
	}

	cur, err := h.Demos.GetByID(id)
	if err != nil {
		response.ErrNotFound(c, "demo not found")
		return
	}
	enabled := cur.Enabled
	if req.Enabled != nil {
		enabled = *req.Enabled
	}
	// If client doesn't provide category_id, keep current category.
	categoryID := cur.CategoryID
	if req.CategoryID != nil {
		categoryID = req.CategoryID
		if categoryID != nil && *categoryID <= 0 {
			categoryID = nil
		}
	}

	in := service.DemoInput{
		Name:        nilString(req.Name, cur.Name),
		Description: nilString(req.Description, cur.Description),
		CoverURL:    nilString(req.CoverURL, cur.CoverURL),
		CategoryID:  categoryID,
		Enabled:     enabled,
	}
	updated, err := h.Demos.UpdateMeta(id, in)
	if err != nil {
		response.ErrInternal(c, "update demo")
		return
	}
	response.OK(c, gin.H{"id": updated.ID, "slug": updated.Slug, "enabled": updated.Enabled})
}

func (h *Handler) AdminDemoDelete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrBadRequest(c, "invalid id")
		return
	}
	if err := h.Demos.Delete(id); err != nil {
		response.ErrNotFound(c, "demo not found")
		return
	}
	response.OKMessage(c, "deleted", nil)
}

func nilString(v *string, def string) string {
	if v == nil {
		return def
	}
	return *v
}

