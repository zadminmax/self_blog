package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/selfblog/backend/pkg/response"
)

type tagBody struct {
	Name string `json:"name" binding:"required"`
	Slug string `json:"slug" binding:"required"`
}

func (h *Handler) TagList(c *gin.Context) {
	list, err := h.Tags.List()
	if err != nil {
		response.ErrInternal(c, "list tags")
		return
	}
	response.OK(c, list)
}

func (h *Handler) TagCreate(c *gin.Context) {
	var req tagBody
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrBadRequest(c, "invalid body")
		return
	}
	t, err := h.Tags.Create(req.Name, req.Slug)
	if err != nil {
		response.ErrBadRequest(c, err.Error())
		return
	}
	response.OK(c, t)
}

func (h *Handler) TagUpdate(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrBadRequest(c, "invalid id")
		return
	}
	var req tagBody
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrBadRequest(c, "invalid body")
		return
	}
	t, err := h.Tags.Update(id, req.Name, req.Slug)
	if err != nil {
		response.ErrNotFound(c, "not found")
		return
	}
	response.OK(c, t)
}

func (h *Handler) TagDelete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrBadRequest(c, "invalid id")
		return
	}
	if err := h.Tags.Delete(id); err != nil {
		response.ErrNotFound(c, "not found")
		return
	}
	response.OKMessage(c, "deleted", nil)
}
