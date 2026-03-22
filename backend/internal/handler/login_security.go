package handler

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/selfblog/backend/pkg/response"
)

func (h *Handler) AdminLoginSecurityGet(c *gin.Context) {
	panel := h.LoginGuard.SnapshotPanel()
	response.OK(c, panel)
}

// AdminLoginSecurityClearThrottle removes throttle for one IP or device.
// Query: kind=ip|device, value=<address or device id>
func (h *Handler) AdminLoginSecurityClearThrottle(c *gin.Context) {
	kind := strings.TrimSpace(c.Query("kind"))
	val := strings.TrimSpace(c.Query("value"))
	if (kind != "ip" && kind != "device") || val == "" {
		response.ErrBadRequest(c, "query kind must be ip or device, and value is required")
		return
	}
	if !h.LoginGuard.ClearThrottle(kind, val) {
		response.ErrNotFound(c, "未找到该限流记录")
		return
	}
	response.OKMessage(c, "已清除", nil)
}
