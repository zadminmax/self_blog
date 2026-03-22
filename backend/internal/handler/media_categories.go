package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/selfblog/backend/pkg/response"
)

func (h *Handler) AdminMediaCategoryList(c *gin.Context) {
	list, err := h.Media.ListCategories()
	if err != nil {
		response.ErrInternal(c, "list media categories")
		return
	}
	response.OK(c, list)
}

