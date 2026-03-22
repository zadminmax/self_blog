package handler

import (
	"errors"

	"github.com/gin-gonic/gin"
	"github.com/selfblog/backend/internal/service"
	"github.com/selfblog/backend/pkg/response"
)

type profileNicknameReq struct {
	Nickname string `json:"nickname" binding:"required"`
}

type profilePasswordReq struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required"`
}

func (h *Handler) MeProfileGet(c *gin.Context) {
	uid, _ := c.Get("userID")
	userID, ok := uid.(int64)
	if !ok {
		response.ErrUnauthorized(c, "invalid user")
		return
	}

	p, err := h.Users.GetProfile(userID)
	if err != nil {
		response.ErrInternal(c, "get profile")
		return
	}
	response.OK(c, p)
}

func (h *Handler) MeProfileUpdate(c *gin.Context) {
	uid, _ := c.Get("userID")
	userID, ok := uid.(int64)
	if !ok {
		response.ErrUnauthorized(c, "invalid user")
		return
	}

	var req profileNicknameReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrBadRequest(c, "invalid body")
		return
	}

	if _, err := h.Users.UpdateProfile(userID, req.Nickname); err != nil {
		response.ErrBadRequest(c, err.Error())
		return
	}

	p, err := h.Users.GetProfile(userID)
	if err != nil {
		response.ErrInternal(c, "reload profile")
		return
	}
	response.OK(c, p)
}

func (h *Handler) MePasswordUpdate(c *gin.Context) {
	uid, _ := c.Get("userID")
	userID, ok := uid.(int64)
	if !ok {
		response.ErrUnauthorized(c, "invalid user")
		return
	}

	var req profilePasswordReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrBadRequest(c, "invalid body")
		return
	}

	if err := h.Users.ChangePassword(userID, req.CurrentPassword, req.NewPassword); err != nil {
		response.ErrBadRequest(c, err.Error())
		return
	}

	response.OKMessage(c, "password updated", gin.H{})
}

func (h *Handler) MeAvatarUpload(c *gin.Context) {
	uid, _ := c.Get("userID")
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
	m, err := h.Media.Save(userID, fh.Filename, ct, src, maxUploadBytes, "", nil, "头像")
	if err != nil {
		if errors.Is(err, service.ErrUnsupportedFileType) {
			response.ErrBadRequest(c, err.Error())
			return
		}
		if errors.Is(err, service.ErrFileTooLarge) {
			response.ErrBadRequest(c, err.Error())
			return
		}
		response.ErrInternal(c, "upload avatar")
		return
	}

	p, err := h.Users.SetAvatar(userID, m.URL)
	if err != nil {
		response.ErrInternal(c, "set avatar")
		return
	}

	// Avoid leaking internal fields; UI only needs profile and avatar url.
	c.Header("Cache-Control", "no-store")
	response.OK(c, gin.H{
		"profile": p,
		"media":   gin.H{"id": m.ID, "url": m.URL, "mime_type": m.MimeType, "size": m.Size},
	})
}

