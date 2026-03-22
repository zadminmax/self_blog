package handler

import (
	"errors"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/selfblog/backend/internal/service"
	"github.com/selfblog/backend/pkg/response"
	"gorm.io/gorm"
)

type userRoleIDsReq struct {
	RoleIDs []int64 `json:"role_ids" binding:"required"`
}

type createUserReq struct {
	Username string  `json:"username" binding:"required"`
	Password string  `json:"password" binding:"required"`
	RoleIDs  []int64 `json:"role_ids"`
	Active   *bool   `json:"active"`
}

type userRoleItem struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

type userItem struct {
	ID       int64           `json:"id"`
	Username string          `json:"username"`
	Active   bool            `json:"active"`
	Roles    []userRoleItem `json:"roles"`
	CreatedAt any            `json:"created_at,omitempty"`
}

type userActiveReq struct {
	Active *bool `json:"active"`
}

func (h *Handler) AdminUserList(c *gin.Context) {
	list, err := h.Users.List()
	if err != nil {
		response.ErrInternal(c, "list users")
		return
	}

	items := make([]userItem, 0, len(list))
	for _, u := range list {
		ri := make([]userRoleItem, 0, len(u.Roles))
		for _, r := range u.Roles {
			ri = append(ri, userRoleItem{ID: r.ID, Name: r.Name})
		}
		items = append(items, userItem{
			ID:        u.ID,
			Username:  u.Username,
			Active:    u.Active,
			Roles:     ri,
			CreatedAt: u.CreatedAt,
		})
	}

	response.OK(c, items)
}

func (h *Handler) AdminUserCreate(c *gin.Context) {
	var req createUserReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrBadRequest(c, "invalid body")
		return
	}

	created, err := h.Users.Create(service.UserInput{
		Username: req.Username,
		Password: req.Password,
		RoleIDs:  req.RoleIDs,
		Active:   req.Active,
	})
	if err != nil {
		response.ErrBadRequest(c, err.Error())
		return
	}

	// Minimal response for front-end
	items := make([]userItem, 0, 1)
	ri := make([]userRoleItem, 0, len(created.Roles))
	for _, r := range created.Roles {
		ri = append(ri, userRoleItem{ID: r.ID, Name: r.Name})
	}
	items = append(items, userItem{
		ID:        created.ID,
		Username:  created.Username,
		Active:    created.Active,
		Roles:     ri,
		CreatedAt: created.CreatedAt,
	})
	response.OK(c, items[0])
}

func (h *Handler) AdminUserSetRoles(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrBadRequest(c, "invalid id")
		return
	}
	var req userRoleIDsReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrBadRequest(c, "invalid body")
		return
	}

	updated, err := h.Users.AssignRoles(id, req.RoleIDs)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.ErrNotFound(c, "not found")
			return
		}
		response.ErrBadRequest(c, err.Error())
		return
	}

	// Response
	ri := make([]userRoleItem, 0, len(updated.Roles))
	for _, r := range updated.Roles {
		ri = append(ri, userRoleItem{ID: r.ID, Name: r.Name})
	}
	response.OK(c, userItem{
		ID:        updated.ID,
		Username:  updated.Username,
		Active:    updated.Active,
		Roles:     ri,
		CreatedAt: updated.CreatedAt,
	})
}

func (h *Handler) AdminUserSetActive(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ErrBadRequest(c, "invalid id")
		return
	}

	var req userActiveReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrBadRequest(c, "invalid body")
		return
	}
	if req.Active == nil {
		response.ErrBadRequest(c, "active required")
		return
	}

	updated, err := h.Users.SetActive(id, *req.Active)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.ErrNotFound(c, "not found")
			return
		}
		response.ErrInternal(c, "update active")
		return
	}

	response.OKMessage(c, "updated", gin.H{
		"id":     updated.ID,
		"active": updated.Active,
	})
}

