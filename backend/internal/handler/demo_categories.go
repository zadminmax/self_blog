package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/selfblog/backend/pkg/response"
)

type demoCategoryBody struct {
	Name string `json:"name" binding:"required"`
	Slug string `json:"slug" binding:"required"`
}

func (h *Handler) AdminDemoCategoryList(c *gin.Context) {
	list, err := h.Demos.ListCategories()
	if err != nil {
		response.ErrInternal(c, "list demo categories")
		return
	}
	response.OK(c, list)
}

func (h *Handler) AdminDemoCategoryCreate(c *gin.Context) {
	var req demoCategoryBody
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrBadRequest(c, "invalid body")
		return
	}
	out, err := h.Demos.CreateCategory(req.Name, req.Slug)
	if err != nil {
		response.ErrBadRequest(c, err.Error())
		return
	}
	response.OK(c, out)
}

func (h *Handler) AdminDemoCategoryUpdate(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrBadRequest(c, "invalid id")
		return
	}
	var req demoCategoryBody
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrBadRequest(c, "invalid body")
		return
	}
	out, err := h.Demos.UpdateCategory(id, req.Name, req.Slug)
	if err != nil {
		response.ErrNotFound(c, "not found")
		return
	}
	response.OK(c, out)
}

func (h *Handler) AdminDemoCategoryDelete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrBadRequest(c, "invalid id")
		return
	}
	if err := h.Demos.DeleteCategory(id); err != nil {
		response.ErrNotFound(c, "not found")
		return
	}
	response.OKMessage(c, "deleted", nil)
}

