package handler

import (
	"errors"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/selfblog/backend/internal/service"
	"github.com/selfblog/backend/pkg/response"
	"gorm.io/gorm"
)

func (h *Handler) AdminMediaList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	ps, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	var uploaderID *int64
	if mine := c.Query("mine"); mine == "1" {
		uid, _ := c.Get("userID")
		if id, ok := uid.(int64); ok {
			uploaderID = &id
		}
	}

	q := c.Query("q")
	var categoryID *int64
	if raw := c.Query("category_id"); raw != "" {
		if id, err := strconv.ParseInt(raw, 10, 64); err == nil && id > 0 {
			categoryID = &id
		}
	}

	items, total, err := h.Media.List(page, ps, uploaderID, q, categoryID)
	if err != nil {
		response.ErrInternal(c, "list media")
		return
	}

	out := make([]gin.H, 0, len(items))
	for i := range items {
		var categoryName *string
		if items[i].Category != nil {
			categoryName = &items[i].Category.Name
		}
		out = append(out, gin.H{
			"id":            items[i].ID,
			"url":           items[i].URL,
			"name":          items[i].Name,
			"category_id":  items[i].CategoryID,
			"category_name": func() any {
				if categoryName == nil {
					return nil
				}
				return *categoryName
			}(),
			"mime_type":     items[i].MimeType,
			"size":          items[i].Size,
			"uploader_id":  items[i].UploaderID,
			"created_at":    items[i].CreatedAt,
		})
	}
	response.OK(c, gin.H{"items": out, "total": total, "page": page, "page_size": ps})
}

func (h *Handler) AdminMediaDelete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrBadRequest(c, "invalid id")
		return
	}

	if err := h.Media.Delete(id); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.ErrNotFound(c, "media not found")
			return
		}
		if errors.Is(err, service.ErrUnsupportedFileType) || errors.Is(err, service.ErrFileTooLarge) {
			response.ErrBadRequest(c, err.Error())
			return
		}
		response.ErrInternal(c, "delete media")
		return
	}

	response.OKMessage(c, "deleted", gin.H{})
}

type mediaMetaUpdateReq struct {
	Name       string `json:"name"`
	CategoryID *int64 `json:"category_id"`
}

func (h *Handler) AdminMediaUpdate(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrBadRequest(c, "invalid id")
		return
	}

	var req mediaMetaUpdateReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrBadRequest(c, "invalid body")
		return
	}

	var categoryID *int64
	if req.CategoryID != nil && *req.CategoryID > 0 {
		categoryID = req.CategoryID
	}

	if err := h.Media.UpdateMeta(id, req.Name, categoryID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.ErrNotFound(c, "media not found")
			return
		}
		response.ErrInternal(c, "update media meta")
		return
	}

	response.OKMessage(c, "updated", gin.H{})
}

