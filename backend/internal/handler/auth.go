package handler

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/selfblog/backend/pkg/response"
)

type loginReq struct {
	Username  string `json:"username" binding:"required"`
	Password  string `json:"password" binding:"required"`
	CaptchaID string `json:"captcha_id" binding:"required"`
	SlideX    int    `json:"slide_x"`
}

func deviceIDFromRequest(c *gin.Context) string {
	d := strings.TrimSpace(c.GetHeader("X-Device-Id"))
	if len(d) > 128 {
		return d[:128]
	}
	return d
}

func (h *Handler) SliderCaptcha(c *gin.Context) {
	id, w := h.LoginGuard.IssueCaptcha()
	response.OK(c, gin.H{
		"captcha_id":  id,
		"track_width": w,
	})
}

func (h *Handler) Login(c *gin.Context) {
	ip := c.ClientIP()
	dev := deviceIDFromRequest(c)

	var req loginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrBadRequest(c, "invalid body")
		return
	}
	userLabel := req.Username

	if frozen, msg := h.LoginGuard.CheckFrozen(ip, dev); frozen {
		h.LoginGuard.LogAttempt(ip, dev, userLabel, false, "locked")
		response.ErrTooManyRequests(c, msg)
		return
	}
	if req.SlideX < 1 || req.SlideX > 300 {
		response.ErrBadRequest(c, "请先将滑块拖至右侧完成验证")
		return
	}
	if !h.LoginGuard.VerifyCaptcha(req.CaptchaID, req.SlideX) {
		h.LoginGuard.LogAttempt(ip, dev, userLabel, false, "captcha")
		response.ErrBadRequest(c, "滑块验证失败或已过期，请重试")
		return
	}

	token, perms, user, err := h.Auth.Login(req.Username, req.Password)
	if err != nil {
		h.LoginGuard.RecordFailure(ip, dev)
		h.LoginGuard.LogAttempt(ip, dev, userLabel, false, "bad_password")
		response.ErrUnauthorized(c, err.Error())
		return
	}
	h.LoginGuard.ClearFailures(ip, dev)
	h.LoginGuard.LogAttempt(ip, dev, user.Username, true, "ok")
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
