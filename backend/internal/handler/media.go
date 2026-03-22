package handler

import (
	"errors"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/selfblog/backend/internal/service"
	"github.com/selfblog/backend/pkg/response"
)

func (h *Handler) MediaUpload(c *gin.Context) {
	uid, ok := c.Get("userID")
	if !ok {
		response.ErrUnauthorized(c, "missing user")
		return
	}
	userID, ok := uid.(int64)
	if !ok {
		response.ErrUnauthorized(c, "invalid user")
		return
	}
	fh, err := c.FormFile("file")
	if err != nil {
		response.ErrBadRequest(c, "file required")
		return
	}
	src, err := fh.Open()
	if err != nil {
		response.ErrBadRequest(c, "open file")
		return
	}
	defer src.Close()
	ct := fh.Header.Get("Content-Type")

	name := c.PostForm("name")
	categoryName := c.PostForm("category_name")
	var categoryID *int64
	if raw := c.PostForm("category_id"); raw != "" {
		if id, err := strconv.ParseInt(raw, 10, 64); err == nil && id > 0 {
			categoryID = &id
		}
	}

	m, err := h.Media.Save(userID, fh.Filename, ct, src, maxUploadBytes, name, categoryID, categoryName)
	if err != nil {
		if errors.Is(err, service.ErrUnsupportedFileType) {
			response.ErrBadRequest(c, err.Error())
			return
		}
		if errors.Is(err, service.ErrFileTooLarge) {
			response.ErrBadRequest(c, err.Error())
			return
		}
		response.ErrBadRequest(c, err.Error())
		return
	}
	response.OK(c, gin.H{"url": m.URL, "id": m.ID, "mime_type": m.MimeType, "size": m.Size})
}
