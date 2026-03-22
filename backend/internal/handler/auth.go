package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/selfblog/backend/pkg/response"
)

type loginReq struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func (h *Handler) Login(c *gin.Context) {
	var req loginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrBadRequest(c, "invalid body")
		return
	}
	token, perms, user, err := h.Auth.Login(req.Username, req.Password)
	if err != nil {
		response.ErrUnauthorized(c, err.Error())
		return
	}
	roles := make([]string, 0, len(user.Roles))
	for _, r := range user.Roles {
		roles = append(roles, r.Name)
	}
	response.OK(c, gin.H{
		"token":       token,
		"permissions": perms,
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"roles":    roles,
		},
	})
}

func (h *Handler) Me(c *gin.Context) {
	uid, _ := c.Get("userID")
	uname, _ := c.Get("username")
	perms, _ := c.Get("permissions")
	response.OK(c, gin.H{
		"id":          uid,
		"username":    uname,
		"permissions": perms,
	})
}
