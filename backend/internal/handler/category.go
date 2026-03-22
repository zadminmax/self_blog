package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/selfblog/backend/pkg/response"
)

type catBody struct {
	Name string `json:"name" binding:"required"`
	Slug string `json:"slug" binding:"required"`
}

func (h *Handler) CategoryList(c *gin.Context) {
	list, err := h.Cats.List()
	if err != nil {
		response.ErrInternal(c, "list categories")
		return
	}
	response.OK(c, list)
}

func (h *Handler) CategoryCreate(c *gin.Context) {
	var req catBody
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrBadRequest(c, "invalid body")
		return
	}
	cat, err := h.Cats.Create(req.Name, req.Slug)
	if err != nil {
		response.ErrBadRequest(c, err.Error())
		return
	}
	response.OK(c, cat)
}

func (h *Handler) CategoryUpdate(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrBadRequest(c, "invalid id")
		return
	}
	var req catBody
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrBadRequest(c, "invalid body")
		return
	}
	cat, err := h.Cats.Update(id, req.Name, req.Slug)
	if err != nil {
		response.ErrNotFound(c, "not found")
		return
	}
	response.OK(c, cat)
}

func (h *Handler) CategoryDelete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrBadRequest(c, "invalid id")
		return
	}
	if err := h.Cats.Delete(id); err != nil {
		response.ErrNotFound(c, "not found")
		return
	}
	response.OKMessage(c, "deleted", nil)
}
