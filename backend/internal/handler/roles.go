package handler

import (
	"errors"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/selfblog/backend/pkg/response"
	"gorm.io/gorm"
)

type roleBody struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

type rolePermissionsReq struct {
	PermissionIDs []int64 `json:"permission_ids" binding:"required"`
}

type roleUpdateReq struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type roleResp struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Permissions []struct {
		ID   int64  `json:"id"`
		Name string `json:"name"`
	} `json:"permissions,omitempty"`
}

func (h *Handler) AdminRoleList(c *gin.Context) {
	list, err := h.Roles.List()
	if err != nil {
		response.ErrInternal(c, "list roles")
		return
	}
	out := make([]roleResp, 0, len(list))
	for _, r := range list {
		out = append(out, roleResp{ID: r.ID, Name: r.Name, Description: r.Description})
	}
	response.OK(c, out)
}

func (h *Handler) AdminRoleCreate(c *gin.Context) {
	var req roleBody
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrBadRequest(c, "invalid body")
		return
	}
	r, err := h.Roles.Create(req.Name, req.Description)
	if err != nil {
		response.ErrBadRequest(c, err.Error())
		return
	}
	response.OK(c, roleResp{ID: r.ID, Name: r.Name, Description: r.Description})
}

func (h *Handler) AdminRoleUpdate(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrBadRequest(c, "invalid id")
		return
	}
	var req roleUpdateReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrBadRequest(c, "invalid body")
		return
	}
	r, err := h.Roles.Update(id, req.Name, req.Description)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.ErrNotFound(c, "not found")
			return
		}
		response.ErrBadRequest(c, err.Error())
		return
	}
	response.OK(c, roleResp{ID: r.ID, Name: r.Name, Description: r.Description})
}

func (h *Handler) AdminRoleSetPermissions(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrBadRequest(c, "invalid id")
		return
	}
	var req rolePermissionsReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrBadRequest(c, "invalid body")
		return
	}

	r, err := h.Roles.SetPermissions(id, req.PermissionIDs)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.ErrNotFound(c, "not found")
			return
		}
		response.ErrBadRequest(c, err.Error())
		return
	}

	// Response
	out := roleResp{ID: r.ID, Name: r.Name, Description: r.Description}
	for _, p := range r.Permissions {
		out.Permissions = append(out.Permissions, struct {
			ID   int64  `json:"id"`
			Name string `json:"name"`
		}{ID: p.ID, Name: p.Name})
	}
	response.OK(c, out)
}

func (h *Handler) AdminRoleGet(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrBadRequest(c, "invalid id")
		return
	}

	r, err := h.Roles.GetByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.ErrNotFound(c, "not found")
			return
		}
		response.ErrBadRequest(c, err.Error())
		return
	}

	out := roleResp{ID: r.ID, Name: r.Name, Description: r.Description}
	for _, p := range r.Permissions {
		out.Permissions = append(out.Permissions, struct {
			ID   int64  `json:"id"`
			Name string `json:"name"`
		}{ID: p.ID, Name: p.Name})
	}
	response.OK(c, out)
}

