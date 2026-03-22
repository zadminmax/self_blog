package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/selfblog/backend/pkg/response"
)

func (h *Handler) Health(c *gin.Context) {
	response.OK(c, gin.H{"status": "ok"})
}
