package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/selfblog/backend/pkg/response"
)

func (h *Handler) AdminPermissionList(c *gin.Context) {
	list, err := h.Perms.List()
	if err != nil {
		response.ErrInternal(c, "list permissions")
		return
	}
	response.OK(c, list)
}

